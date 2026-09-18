import { PrismaService } from '../database/prisma.service';
import { NotificationProcessor } from './notification.processor';

describe('NotificationProcessor', () => {
  function createProcessor(prismaOverrides: Record<string, unknown>) {
    const prisma = {
      notificationJob: {
        findFirst: jest.fn(),
        updateMany: jest.fn(),
        update: jest.fn(),
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
        update: jest.Mock;
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
    expect(client.notificationJob.update).toHaveBeenCalledWith({
      where: { id: 'job-1' },
      data: { status: 'completed', lastError: null },
    });
  });

  it('records a retryable failure with the next backoff time', async () => {
    const { prisma, processor } = createProcessor({});
    const client = prisma as unknown as {
      notificationJob: {
        findFirst: jest.Mock;
        updateMany: jest.Mock;
        update: jest.Mock;
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

    const retryUpdate = client.notificationJob.update.mock.calls[0] as [
      { data: { status: string; lastError: string } },
    ];
    expect(retryUpdate[0].data).toMatchObject({
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
        update: jest.Mock;
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

    const failedUpdate = client.notificationJob.update.mock.calls[0] as [
      { data: { status: string; lastError: string } },
    ];
    expect(failedUpdate[0].data).toMatchObject({
      status: 'failed',
      lastError: '永久失败',
    });
  });
});
