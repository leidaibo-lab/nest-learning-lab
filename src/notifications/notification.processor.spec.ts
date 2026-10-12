import { Logger } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { ApplicationLifecycleService } from '../lifecycle/application-lifecycle.service';
import { NotificationProcessor } from './notification.processor';

describe('NotificationProcessor', () => {
  const observations: Array<Record<string, unknown>> = [];
  beforeEach(() => {
    observations.length = 0;
    jest
      .spyOn(Logger.prototype, 'log')
      .mockImplementation((message: unknown) => {
        if (typeof message === 'string') {
          observations.push(JSON.parse(message) as Record<string, unknown>);
        }
      });
  });
  afterEach(() => jest.restoreAllMocks());

  function deferred<T>() {
    let resolve!: (value: T) => void;
    let reject!: (reason: Error) => void;
    const promise = new Promise<T>((finish, fail) => {
      resolve = finish;
      reject = fail;
    });
    return { promise, resolve, reject };
  }
  type UpdateCall = [
    {
      where: Record<string, unknown>;
      data: Record<string, unknown>;
    },
  ];

  function createProcessor(prismaOverrides: Record<string, unknown>) {
    const prisma = {
      notificationJob: {
        count: jest.fn().mockResolvedValue(0),
        findFirst: jest.fn(),
        updateMany: jest.fn(),
      },
      taskEvent: { findUnique: jest.fn() },
      projectMember: { findMany: jest.fn() },
      notification: { createMany: jest.fn() },
      ...prismaOverrides,
    } as unknown as PrismaService;
    return {
      prisma,
      processor: new NotificationProcessor(prisma),
    };
  }

  it('creates one idempotent notification per project member', async () => {
    const { prisma, processor } = createProcessor({});
    const job = {
      id: 'job-1',
      eventId: 'event-1',
      attempts: 0,
      tenantId: 'tenant-1',
      createdAt: new Date(),
    };
    const event = {
      id: 'event-1',
      taskId: 'task-1',
      fromStatus: 'todo',
      toStatus: 'in_progress',
      version: 2,
      tenantId: 'tenant-1',
      task: { projectId: 'project-1' },
    };
    const client = prisma as unknown as {
      notificationJob: {
        findFirst: jest.Mock;
        updateMany: jest.Mock;
      };
      taskEvent: { findUnique: jest.Mock };
      projectMember: { findMany: jest.Mock };
      notification: { createMany: jest.Mock };
    };
    client.notificationJob.findFirst
      .mockResolvedValueOnce(job)
      .mockResolvedValueOnce(undefined);
    client.notificationJob.updateMany.mockResolvedValue({ count: 1 });
    client.taskEvent.findUnique.mockResolvedValue(event);
    client.projectMember.findMany.mockResolvedValue([
      { userId: 'user-1' },
      { userId: 'user-2' },
    ]);

    await processor.processPending();

    expect(client.notification.createMany).toHaveBeenCalledWith({
      data: [
        expect.objectContaining({
          userId: 'user-1',
          taskEventId: 'event-1',
          tenantId: 'tenant-1',
        }),
        expect.objectContaining({
          userId: 'user-2',
          taskEventId: 'event-1',
          tenantId: 'tenant-1',
        }),
      ],
      skipDuplicates: true,
    });
    const updateCalls = client.notificationJob.updateMany.mock
      .calls as UpdateCall[];
    const terminalUpdate = updateCalls[updateCalls.length - 1][0];
    expect(terminalUpdate.where.id).toBe('job-1');
    expect(terminalUpdate.where.status).toBe('processing');
    expect(terminalUpdate.where.leaseToken).toEqual(expect.any(String));
    expect(
      (terminalUpdate.where.leaseUntil as { gt: unknown }).gt,
    ).toBeInstanceOf(Date);
    expect(terminalUpdate.data).toMatchObject({
      status: 'completed',
      leaseToken: null,
      leaseUntil: null,
      lastError: null,
    });
    const renewalUpdate = updateCalls[1][0];
    expect(renewalUpdate.where.id).toBe('job-1');
    expect(renewalUpdate.where.status).toBe('processing');
    expect(renewalUpdate.where.leaseToken).toEqual(expect.any(String));
    expect(
      (renewalUpdate.where.leaseUntil as { gt: unknown }).gt,
    ).toBeInstanceOf(Date);
    expect(renewalUpdate.data.leaseUntil).toBeInstanceOf(Date);
    expect(observations).toContainEqual(
      expect.objectContaining({
        event: 'notification.attempt',
        outcome: 'completed',
        durationMs: expect.any(Number) as number,
      }),
    );
  });

  it('reclaims a processing job after its lease expires', async () => {
    const { prisma, processor } = createProcessor({});
    const client = prisma as unknown as {
      notificationJob: {
        findFirst: jest.Mock;
        updateMany: jest.Mock;
      };
      taskEvent: { findUnique: jest.Mock };
      projectMember: { findMany: jest.Mock };
      notification: { createMany: jest.Mock };
    };
    const expiredJob = {
      id: 'job-1',
      eventId: 'event-1',
      attempts: 1,
      tenantId: 'tenant-1',
      status: 'processing',
      leaseUntil: new Date(Date.now() - 1_000),
      createdAt: new Date(),
    };
    client.notificationJob.findFirst
      .mockResolvedValueOnce(expiredJob)
      .mockResolvedValueOnce(undefined);
    client.notificationJob.updateMany.mockResolvedValue({ count: 1 });
    client.taskEvent.findUnique.mockResolvedValue({
      id: 'event-1',
      taskId: 'task-1',
      fromStatus: 'todo',
      toStatus: 'done',
      version: 2,
      tenantId: 'tenant-1',
      task: { projectId: 'project-1' },
    });
    client.projectMember.findMany.mockResolvedValue([]);

    await processor.processPending();

    const claimUpdate = client.notificationJob.updateMany.mock.calls[0] as [
      {
        where: {
          id: string;
          OR: Array<{
            status: string;
            availableAt?: { lte: Date };
            leaseUntil?: { lte: Date };
          }>;
        };
        data: { status: string; leaseToken: string; leaseUntil: Date };
      },
    ];
    expect(claimUpdate[0].where.id).toBe('job-1');
    const processingCondition = claimUpdate[0].where.OR.find(
      (condition) => condition.status === 'processing',
    );
    expect(processingCondition).toBeDefined();
    expect(processingCondition?.leaseUntil?.lte).toBeInstanceOf(Date);
    expect(claimUpdate[0].data.status).toBe('processing');
    expect(claimUpdate[0].data.leaseToken).toEqual(expect.any(String));
    expect(claimUpdate[0].data.leaseUntil).toBeInstanceOf(Date);
  });

  it('records a retryable failure with the next backoff time', async () => {
    const { prisma, processor } = createProcessor({});
    const client = prisma as unknown as {
      notificationJob: {
        findFirst: jest.Mock;
        updateMany: jest.Mock;
      };
      taskEvent: { findUnique: jest.Mock };
    };
    client.notificationJob.findFirst.mockResolvedValueOnce({
      id: 'job-1',
      eventId: 'event-1',
      attempts: 0,
      tenantId: 'tenant-1',
      createdAt: new Date(),
    });
    client.notificationJob.findFirst.mockResolvedValueOnce(undefined);
    client.notificationJob.updateMany.mockResolvedValue({ count: 1 });
    client.taskEvent.findUnique.mockRejectedValue(
      new Error('数据库暂时不可用'),
    );

    await processor.processPending();

    const updateCalls = client.notificationJob.updateMany.mock
      .calls as UpdateCall[];
    const retryUpdate = updateCalls[updateCalls.length - 1][0];
    expect(retryUpdate.data).toMatchObject({
      status: 'pending',
      lastError: '数据库暂时不可用',
    });
  });

  it('marks the job failed after the third attempt', async () => {
    const { prisma, processor } = createProcessor({});
    const client = prisma as unknown as {
      notificationJob: {
        findFirst: jest.Mock;
        updateMany: jest.Mock;
      };
      taskEvent: { findUnique: jest.Mock };
    };
    client.notificationJob.findFirst.mockResolvedValueOnce({
      id: 'job-1',
      eventId: 'event-1',
      attempts: 2,
      tenantId: 'tenant-1',
      createdAt: new Date(),
    });
    client.notificationJob.findFirst.mockResolvedValueOnce(undefined);
    client.notificationJob.updateMany.mockResolvedValue({ count: 1 });
    client.taskEvent.findUnique.mockRejectedValue(new Error('永久失败'));

    await processor.processPending();

    const updateCalls = client.notificationJob.updateMany.mock
      .calls as UpdateCall[];
    const failedUpdate = updateCalls[updateCalls.length - 1][0];
    expect(failedUpdate.data).toMatchObject({
      status: 'failed',
      lastError: '永久失败',
    });
  });

  it('does not let a stale lease write a failure result', async () => {
    const { prisma, processor } = createProcessor({});
    const client = prisma as unknown as {
      notificationJob: {
        findFirst: jest.Mock;
        updateMany: jest.Mock;
      };
      taskEvent: { findUnique: jest.Mock };
      projectMember: { findMany: jest.Mock };
      notification: { createMany: jest.Mock };
    };
    client.notificationJob.findFirst
      .mockResolvedValueOnce({
        id: 'job-1',
        eventId: 'event-1',
        attempts: 1,
        tenantId: 'tenant-1',
        createdAt: new Date(),
      })
      .mockResolvedValueOnce(undefined);
    // 第一次是认领，第二次模拟令牌已被其他实例替换，第三次是旧实例的失败写入。
    client.notificationJob.updateMany
      .mockResolvedValueOnce({ count: 1 })
      .mockResolvedValueOnce({ count: 0 })
      .mockResolvedValueOnce({ count: 0 });
    client.taskEvent.findUnique.mockResolvedValue({
      id: 'event-1',
      taskId: 'task-1',
      fromStatus: 'todo',
      toStatus: 'done',
      version: 2,
      tenantId: 'tenant-1',
      task: { projectId: 'project-1' },
    });
    client.projectMember.findMany.mockResolvedValue([{ userId: 'user-1' }]);

    await processor.processPending();

    expect(client.notification.createMany).not.toHaveBeenCalled();
    expect(client.notificationJob.updateMany).toHaveBeenCalledTimes(3);
    const updateCalls = client.notificationJob.updateMany.mock
      .calls as UpdateCall[];
    expect(updateCalls[2][0].where.id).toBe('job-1');
    expect(updateCalls[2][0].where.status).toBe('processing');
    expect(updateCalls[2][0].where.leaseToken).toEqual(expect.any(String));
    expect(observations).toContainEqual(
      expect.objectContaining({
        event: 'notification.attempt',
        outcome: 'lease_lost',
      }),
    );
  });

  it('keeps processing when backlog sampling fails and records unknown backlog', async () => {
    const { prisma, processor } = createProcessor({});
    const client = prisma as unknown as {
      notificationJob: { count: jest.Mock; findFirst: jest.Mock };
    };
    client.notificationJob.count.mockRejectedValue(new Error('采样失败'));
    client.notificationJob.findFirst.mockResolvedValue(undefined);

    await processor.processPending();

    expect(client.notificationJob.findFirst).toHaveBeenCalledTimes(1);
    expect(observations).toContainEqual(
      expect.objectContaining({
        event: 'notification.batch',
        backlog: null,
        outcome: 'finished',
      }),
    );
  });

  it.each(['slow', 'failure'] as const)(
    'handles a %s renewal heartbeat during a long task and drains all queries',
    async (scenario) => {
      jest.useFakeTimers();
      const { prisma, processor } = createProcessor({});
      const client = prisma as unknown as {
        notificationJob: { findFirst: jest.Mock; updateMany: jest.Mock };
        taskEvent: { findUnique: jest.Mock };
        projectMember: { findMany: jest.Mock };
        notification: { createMany: jest.Mock };
      };
      const event = deferred<object>();
      const eventStarted = deferred<void>();
      const heartbeat = deferred<{ count: number }>();
      const terminalWritten = deferred<void>();
      client.notificationJob.findFirst
        .mockResolvedValueOnce({
          id: 'job-1',
          eventId: 'event-1',
          attempts: 0,
          tenantId: 'tenant-1',
        })
        .mockResolvedValue(undefined);
      client.taskEvent.findUnique.mockImplementation(() => {
        eventStarted.resolve();
        return event.promise;
      });
      client.projectMember.findMany.mockResolvedValue([]);
      client.notificationJob.updateMany.mockImplementation(
        (args: { data: { status?: string } }) => {
          if (args.data.status === 'completed') {
            terminalWritten.resolve();
          }
          return Promise.resolve({ count: 1 });
        },
      );
      // 认领先完成，第二个更新是 10 秒时触发的周期心跳。
      client.notificationJob.updateMany
        .mockResolvedValueOnce({ count: 1 })
        .mockImplementationOnce(() => heartbeat.promise);
      let drain: Promise<void> | undefined;
      try {
        processor.schedule();
        await jest.advanceTimersByTimeAsync(0);
        await eventStarted.promise;
        await jest.advanceTimersByTimeAsync(10_000);
        expect(client.notificationJob.updateMany).toHaveBeenCalledTimes(2);
        if (scenario === 'slow') {
          // 续租未结束时跨过两个周期，也不允许堆积新的周期查询。
          await jest.advanceTimersByTimeAsync(20_000);
          expect(client.notificationJob.updateMany).toHaveBeenCalledTimes(2);
        } else {
          heartbeat.reject(new Error('单次心跳数据库故障'));
          await jest.advanceTimersByTimeAsync(0);
        }
        drain = processor.onModuleDestroy();
        event.resolve({
          id: 'event-1',
          taskId: 'task-1',
          tenantId: 'tenant-1',
          fromStatus: 'todo',
          toStatus: 'done',
          version: 2,
          task: { projectId: 'project-1' },
        });
        await terminalWritten.promise;
        if (scenario === 'slow') {
          // 终态已写入也不能提前释放连接：周期心跳仍是一条真实的在途数据库查询。
          expect(
            observations.some((entry) => entry.event === 'notification.drain'),
          ).toBe(false);
          heartbeat.resolve({ count: 0 });
        }
        await drain;
        expect(client.notification.createMany).toHaveBeenCalledTimes(1);
        expect(observations).toContainEqual(
          expect.objectContaining({
            event: 'notification.attempt',
            outcome: 'completed',
          }),
        );
        expect(client.notificationJob.findFirst).toHaveBeenCalledTimes(1);
        expect(jest.getTimerCount()).toBe(0);
      } finally {
        heartbeat.resolve({ count: 0 });
        event.resolve({});
        await drain;
        await processor.onModuleDestroy();
        jest.clearAllTimers();
        jest.useRealTimers();
      }
    },
  );

  it('records backlog and waits for an active scan before finishing drain', async () => {
    const { prisma, processor } = createProcessor({});
    const client = prisma as unknown as {
      notificationJob: { count: jest.Mock; findFirst: jest.Mock };
    };
    client.notificationJob.count.mockResolvedValue(12);
    let finishScan!: () => void;
    const scanStarted = new Promise<void>((resolve) => {
      client.notificationJob.findFirst.mockImplementation(() => {
        resolve();
        return new Promise<undefined>((finish) => {
          finishScan = () => finish(undefined);
        });
      });
    });
    processor.schedule();
    await scanStarted;
    const drain = processor.onModuleDestroy();
    expect(
      observations.some((entry) => entry.event === 'notification.drain'),
    ).toBe(false);
    finishScan();
    await drain;
    expect(observations).toContainEqual(
      expect.objectContaining({ event: 'notification.batch', backlog: 12 }),
    );
    expect(observations).toContainEqual(
      expect.objectContaining({
        event: 'notification.drain',
        durationMs: expect.any(Number) as number,
      }),
    );
  });

  it('yields after one bounded batch and schedules the next batch', async () => {
    jest.useFakeTimers();
    try {
      const { prisma, processor } = createProcessor({});
      const client = prisma as unknown as {
        notificationJob: {
          findFirst: jest.Mock;
          updateMany: jest.Mock;
        };
        taskEvent: { findUnique: jest.Mock };
        projectMember: { findMany: jest.Mock };
        notification: { createMany: jest.Mock };
      };
      const jobs = Array.from({ length: 51 }, (_, index) => ({
        id: `job-${index}`,
        eventId: `event-${index}`,
        attempts: 0,
        tenantId: 'tenant-1',
        createdAt: new Date(),
      }));
      for (const job of jobs.slice(0, 50)) {
        client.notificationJob.findFirst.mockResolvedValueOnce(job);
      }
      client.notificationJob.findFirst.mockResolvedValue(undefined);
      client.notificationJob.updateMany.mockResolvedValue({ count: 1 });
      client.taskEvent.findUnique.mockImplementation(
        (args: { where: { id: string } }) =>
          Promise.resolve({
            id: args.where.id,
            taskId: 'task-1',
            fromStatus: 'todo',
            toStatus: 'done',
            version: 2,
            tenantId: 'tenant-1',
            task: { projectId: 'project-1' },
          }),
      );
      client.projectMember.findMany.mockResolvedValue([]);

      await processor.processPending();

      expect(client.notificationJob.findFirst).toHaveBeenCalledTimes(50);
      expect(jest.getTimerCount()).toBe(1);
    } finally {
      jest.clearAllTimers();
      jest.useRealTimers();
    }
  });

  it('does not claim new jobs after shutdown starts', async () => {
    const { prisma } = createProcessor({});
    const lifecycle = new ApplicationLifecycleService();
    const processor = new NotificationProcessor(prisma, lifecycle);
    const client = prisma as unknown as {
      notificationJob: { findFirst: jest.Mock };
    };

    lifecycle.beforeApplicationShutdown('SIGTERM');

    await processor.processPending();

    expect(client.notificationJob.findFirst).not.toHaveBeenCalled();
  });

  it('retries a failed database scan after a delay and recovers', async () => {
    jest.useFakeTimers();
    const { prisma, processor } = createProcessor({});
    const client = prisma as unknown as {
      notificationJob: { findFirst: jest.Mock };
    };
    const scan = client.notificationJob.findFirst;
    scan
      .mockRejectedValueOnce(new Error('数据库暂时不可用'))
      .mockResolvedValue(undefined);

    try {
      processor.schedule();
      await jest.advanceTimersByTimeAsync(0);
      expect(scan).toHaveBeenCalledTimes(1);

      // 依赖故障不能触发立即重试的忙循环；时间由 fake timers 控制，不依赖机器速度。
      await jest.advanceTimersByTimeAsync(999);
      expect(scan).toHaveBeenCalledTimes(1);
      await jest.advanceTimersByTimeAsync(2);
      expect(scan).toHaveBeenCalledTimes(2);
      expect(jest.getTimerCount()).toBe(0);
    } finally {
      await processor.onModuleDestroy();
      jest.clearAllTimers();
      jest.useRealTimers();
    }
  });

  it('stops a pending database retry when the instance starts draining', async () => {
    jest.useFakeTimers();
    const { prisma } = createProcessor({});
    const lifecycle = new ApplicationLifecycleService();
    const processor = new NotificationProcessor(prisma, lifecycle);
    const client = prisma as unknown as {
      notificationJob: { findFirst: jest.Mock };
    };
    const scan = client.notificationJob.findFirst;
    scan.mockRejectedValueOnce(new Error('数据库暂时不可用'));

    try {
      processor.schedule();
      await jest.advanceTimersByTimeAsync(0);
      lifecycle.beforeApplicationShutdown('SIGTERM');
      // 即使故障恢复定时器已经登记，排空也必须优先于下一次任务认领。
      await jest.advanceTimersByTimeAsync(1_001);
      expect(scan).toHaveBeenCalledTimes(1);
      expect(jest.getTimerCount()).toBe(0);
    } finally {
      await processor.onModuleDestroy();
      jest.clearAllTimers();
      jest.useRealTimers();
    }
  });
});
