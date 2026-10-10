import { PrismaService } from '../database/prisma.service';
import { NotificationProcessor } from './notification.processor';

describe('NotificationProcessor', () => {
  type UpdateCall = [
    {
      where: Record<string, unknown>;
      data: Record<string, unknown>;
    },
  ];

  function createProcessor(prismaOverrides: Record<string, unknown>) {
    const prisma = {
      notificationJob: {
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
  });
});
