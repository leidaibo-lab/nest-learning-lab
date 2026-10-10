import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
  Optional,
} from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { Prisma } from '../../generated/prisma';
import { PrismaService } from '../database/prisma.service';
import { ApplicationLifecycleService } from '../lifecycle/application-lifecycle.service';

const MAX_ATTEMPTS = 3;
const RETRY_DELAYS_MS = [1000, 2000];
// 当前学习假设是轻量通知可在 30 秒内完成，10 秒续租为事件循环暂停或数据库抖动预留余量。
// 这不是容量承诺，正式环境需按处理耗时分位数、数据库压力和故障演练重新校准。
const LEASE_DURATION_MS = 30_000;
const LEASE_RENEW_INTERVAL_MS = 10_000;
const PROCESSOR_ERROR_RETRY_DELAY_MS = 1_000;
// 单次只处理有限任务后主动让出事件循环，避免 backlog 下一个 Provider 无限 drain。
// 这是应用内的协作式背压，不代表队列容量；批次大小仍需通过压测和数据库压力重新校准。
const MAX_JOBS_PER_RUN = 50;

@Injectable()
export class NotificationProcessor implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(NotificationProcessor.name);
  private processing = false;
  private closed = false;
  private retryTimer?: NodeJS.Timeout;
  private activeRun?: Promise<void>;

  constructor(
    private readonly prisma: PrismaService,
    @Optional() private readonly lifecycle?: ApplicationLifecycleService,
  ) {}

  onModuleInit(): void {
    // 启动时先扫描上次进程退出前留下的 pending 任务，避免异步工作只依赖内存。
    this.schedule();
  }

  async onModuleDestroy(): Promise<void> {
    this.closed = true;
    if (this.retryTimer) {
      clearTimeout(this.retryTimer);
    }
    // 等待正在执行的数据库操作结束；后台循环错误已记录并安排重试，不应阻断 Prisma 释放连接。
    await this.activeRun?.catch(() => undefined);
  }

  schedule(): void {
    if (this.isDraining() || this.closed || this.processing) {
      return;
    }

    // setImmediate 将通知处理移出当前 HTTP 调用栈，使状态更新响应不等待通知写入。
    setImmediate(() => {
      if (this.isDraining() || this.closed) {
        return;
      }
      const run = this.processPending();
      this.activeRun = run;
      void run
        .catch((error: unknown) => {
          const message = error instanceof Error ? error.message : '未知错误';
          this.logger.warn(`通知处理循环失败，将延迟重试: ${message}`);
          this.scheduleProcessorRetry();
        })
        .finally(() => {
          if (this.activeRun === run) {
            this.activeRun = undefined;
          }
        });
    });
  }

  async processPending(): Promise<void> {
    if (this.isDraining() || this.closed || this.processing) {
      return;
    }

    this.processing = true;
    let processedJobs = 0;
    let needsContinuation = false;
    try {
      while (
        !this.isDraining() &&
        !this.closed &&
        processedJobs < MAX_JOBS_PER_RUN
      ) {
        const job = await this.claimNextJob();
        if (!job) {
          return;
        }

        await this.processJob(job);
        processedJobs += 1;
      }
      needsContinuation =
        !this.isDraining() &&
        !this.closed &&
        processedJobs === MAX_JOBS_PER_RUN;
    } finally {
      this.processing = false;
      if (needsContinuation) {
        // 下一批通过 setImmediate 排队，给 HTTP 请求和关闭信号留下调度机会。
        this.schedule();
      }
    }
  }

  private isDraining(): boolean {
    return this.lifecycle?.isDraining() ?? false;
  }

  private scheduleProcessorRetry(): void {
    if (this.closed || this.isDraining() || this.retryTimer) {
      return;
    }

    // 依赖故障时延迟重试，避免后台循环把数据库不可用放大成忙循环或未处理异常。
    this.retryTimer = setTimeout(() => {
      this.retryTimer = undefined;
      this.schedule();
    }, PROCESSOR_ERROR_RETRY_DELAY_MS);
  }

  private async claimNextJob() {
    const now = new Date();
    const candidate = await this.prisma.notificationJob.findFirst({
      where: {
        OR: [
          { status: 'pending', availableAt: { lte: now } },
          { status: 'processing', leaseUntil: { lte: now } },
        ],
      },
      orderBy: { createdAt: 'asc' },
    });
    if (!candidate) {
      return undefined;
    }

    // 租约把“当前由谁处理”持久化到数据库，实例崩溃后其他实例才能判断何时恢复。
    // findFirst 只是缩小候选范围，条件更新才是多实例竞争时的最终仲裁。
    const leaseToken = randomUUID();
    const leaseUntil = new Date(now.getTime() + LEASE_DURATION_MS);
    const claimed = await this.prisma.notificationJob.updateMany({
      where: {
        id: candidate.id,
        OR: [
          { status: 'pending', availableAt: { lte: now } },
          { status: 'processing', leaseUntil: { lte: now } },
        ],
      },
      data: {
        status: 'processing',
        attempts: { increment: 1 },
        leaseToken,
        leaseUntil,
      },
    });
    return claimed.count === 1
      ? { ...candidate, attempts: candidate.attempts + 1, leaseToken }
      : undefined;
  }

  private async processJob(job: {
    id: string;
    eventId: string;
    attempts: number;
    tenantId: string;
    leaseToken: string;
  }) {
    // 心跳只延长仍属于本次尝试的租约；令牌变化时，旧实例不能继续续租。
    const renewalTimer = setInterval(() => {
      void this.renewLease(job).catch((error: unknown) => {
        const message = error instanceof Error ? error.message : '未知错误';
        this.logger.warn(`通知任务 ${job.id} 租约续期失败: ${message}`);
      });
    }, LEASE_RENEW_INTERVAL_MS);

    try {
      const event = await this.prisma.taskEvent.findUnique({
        where: { id: job.eventId },
        include: { task: true },
      });
      if (!event) {
        throw new Error(`任务事件 ${job.eventId} 不存在`);
      }
      if (event.tenantId !== job.tenantId) {
        throw new Error('通知任务与任务事件的租户不一致');
      }

      const members = await this.prisma.projectMember.findMany({
        where: {
          projectId: event.task.projectId,
          project: { tenantId: job.tenantId },
        },
        select: { userId: true },
      });
      if (!(await this.renewLease(job))) {
        throw new Error('通知任务租约已失效，放弃本次处理结果');
      }
      await this.prisma.notification.createMany({
        data: members.map(({ userId }) => ({
          userId,
          taskEventId: event.id,
          tenantId: job.tenantId,
          kind: 'task.status_changed',
          payload: {
            taskId: event.taskId,
            tenantId: job.tenantId,
            fromStatus: event.fromStatus,
            toStatus: event.toStatus,
            version: event.version,
          } satisfies Prisma.InputJsonValue,
        })),
        skipDuplicates: true,
      });
      const completed = await this.prisma.notificationJob.updateMany({
        // 只有当前令牌仍持有未过期租约，才能提交终态，形成处理权围栏。
        where: {
          id: job.id,
          status: 'processing',
          leaseToken: job.leaseToken,
          leaseUntil: { gt: new Date() },
        },
        data: {
          status: 'completed',
          leaseToken: null,
          leaseUntil: null,
          lastError: null,
        },
      });
      if (completed.count !== 1) {
        this.logger.warn(
          `通知任务 ${job.id} 已失去租约，忽略过期实例的完成结果`,
        );
      }
    } catch (error) {
      await this.recordFailure(job, error);
    } finally {
      clearInterval(renewalTimer);
    }
  }

  private async renewLease(job: {
    id: string;
    leaseToken: string;
  }): Promise<boolean> {
    const now = new Date();
    const renewed = await this.prisma.notificationJob.updateMany({
      where: {
        id: job.id,
        status: 'processing',
        leaseToken: job.leaseToken,
        leaseUntil: { gt: now },
      },
      data: {
        leaseUntil: new Date(now.getTime() + LEASE_DURATION_MS),
      },
    });
    return renewed.count === 1;
  }

  private async recordFailure(
    job: { id: string; attempts: number; leaseToken: string },
    error: unknown,
  ): Promise<void> {
    const message = error instanceof Error ? error.message : '未知通知处理错误';
    const exhausted = job.attempts >= MAX_ATTEMPTS;
    const delay = RETRY_DELAYS_MS[job.attempts - 1] ?? RETRY_DELAYS_MS.at(-1)!;

    const failed = await this.prisma.notificationJob.updateMany({
      // 旧实例即使稍后恢复，也不能把新实例的处理再次改成 pending/failed。
      where: {
        id: job.id,
        status: 'processing',
        leaseToken: job.leaseToken,
        leaseUntil: { gt: new Date() },
      },
      data: {
        status: exhausted ? 'failed' : 'pending',
        leaseToken: null,
        leaseUntil: null,
        availableAt: new Date(Date.now() + delay),
        lastError: message.slice(0, 500),
      },
    });
    if (failed.count !== 1) {
      this.logger.warn(`通知任务 ${job.id} 已失去租约，忽略过期实例的失败结果`);
      return;
    }
    if (!exhausted && !this.closed) {
      // 只有可重试任务才设置下一次唤醒，避免失败任务形成无间隔的忙循环。
      this.retryTimer = setTimeout(() => {
        this.retryTimer = undefined;
        this.schedule();
      }, delay);
    }
    this.logger.error(
      `通知任务 ${job.id} 第 ${job.attempts} 次处理失败: ${message}`,
    );
  }
}
