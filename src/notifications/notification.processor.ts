import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { Prisma } from '../../generated/prisma';
import { PrismaService } from '../database/prisma.service';

const MAX_ATTEMPTS = 3;
const RETRY_DELAYS_MS = [1000, 2000];

@Injectable()
export class NotificationProcessor implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(NotificationProcessor.name);
  private processing = false;
  private closed = false;
  private retryTimer?: NodeJS.Timeout;
  private activeRun?: Promise<void>;

  constructor(private readonly prisma: PrismaService) {}

  onModuleInit(): void {
    // 启动时先扫描上次进程退出前留下的 pending 任务，避免异步工作只依赖内存。
    this.schedule();
  }

  async onModuleDestroy(): Promise<void> {
    this.closed = true;
    if (this.retryTimer) {
      clearTimeout(this.retryTimer);
    }
    // 等待正在执行的数据库操作结束，再由 PrismaModule 断开连接。
    await this.activeRun;
  }

  schedule(): void {
    if (this.closed || this.processing) {
      return;
    }

    // setImmediate 将通知处理移出当前 HTTP 调用栈，使状态更新响应不等待通知写入。
    setImmediate(() => {
      if (this.closed) {
        return;
      }
      const run = this.processPending();
      this.activeRun = run;
      void run.finally(() => {
        if (this.activeRun === run) {
          this.activeRun = undefined;
        }
      });
    });
  }

  async processPending(): Promise<void> {
    if (this.closed || this.processing) {
      return;
    }

    this.processing = true;
    try {
      while (!this.closed) {
        const job = await this.claimNextJob();
        if (!job) {
          return;
        }

        await this.processJob(job);
      }
    } finally {
      this.processing = false;
    }
  }

  private async claimNextJob() {
    const candidate = await this.prisma.notificationJob.findFirst({
      where: { status: 'pending', availableAt: { lte: new Date() } },
      orderBy: { createdAt: 'asc' },
    });
    if (!candidate) {
      return undefined;
    }

    // 条件更新同时承担“抢占”作用；多个应用实例竞争时只有一个能获得该任务。
    const claimed = await this.prisma.notificationJob.updateMany({
      where: { id: candidate.id, status: 'pending' },
      data: { status: 'processing', attempts: { increment: 1 } },
    });
    return claimed.count === 1
      ? { ...candidate, attempts: candidate.attempts + 1 }
      : undefined;
  }

  private async processJob(job: {
    id: string;
    eventId: string;
    attempts: number;
  }) {
    try {
      const event = await this.prisma.taskEvent.findUnique({
        where: { id: job.eventId },
        include: { task: true },
      });
      if (!event) {
        throw new Error(`任务事件 ${job.eventId} 不存在`);
      }

      const members = await this.prisma.projectMember.findMany({
        where: { projectId: event.task.projectId },
        select: { userId: true },
      });
      await this.prisma.notification.createMany({
        data: members.map(({ userId }) => ({
          userId,
          taskEventId: event.id,
          kind: 'task.status_changed',
          payload: {
            taskId: event.taskId,
            fromStatus: event.fromStatus,
            toStatus: event.toStatus,
            version: event.version,
          } satisfies Prisma.InputJsonValue,
        })),
        skipDuplicates: true,
      });
      await this.prisma.notificationJob.update({
        where: { id: job.id },
        data: { status: 'completed', lastError: null },
      });
    } catch (error) {
      await this.recordFailure(job, error);
    }
  }

  private async recordFailure(
    job: { id: string; attempts: number },
    error: unknown,
  ): Promise<void> {
    const message = error instanceof Error ? error.message : '未知通知处理错误';
    const exhausted = job.attempts >= MAX_ATTEMPTS;
    const delay = RETRY_DELAYS_MS[job.attempts - 1] ?? RETRY_DELAYS_MS.at(-1)!;

    await this.prisma.notificationJob.update({
      where: { id: job.id },
      data: {
        status: exhausted ? 'failed' : 'pending',
        availableAt: new Date(Date.now() + delay),
        lastError: message.slice(0, 500),
      },
    });
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
