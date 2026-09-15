import { ConfigModule } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { randomUUID } from 'node:crypto';
import { validateEnvironment } from '../src/config/environment';
import { DatabaseModule } from '../src/database/database.module';
import { PrismaService } from '../src/database/prisma.service';
import { PrismaTaskRepository } from '../src/tasks/prisma-task.repository';
import { Task } from '../src/tasks/task';
import { NotificationProcessor } from '../src/notifications/notification.processor';

describe('PrismaTaskRepository (integration)', () => {
  let module: TestingModule;
  let prisma: PrismaService;
  let repository: PrismaTaskRepository;
  let projectId: string;

  beforeAll(async () => {
    module = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          ignoreEnvFile: true,
          validate: validateEnvironment,
        }),
        DatabaseModule,
      ],
      providers: [PrismaTaskRepository],
    }).compile();

    await module.init();
    prisma = module.get(PrismaService);
    repository = module.get(PrismaTaskRepository);
  });

  beforeEach(async () => {
    const user = await prisma.user.create({
      data: {
        email: `${randomUUID()}@example.com`,
        passwordHash: 'test-hash',
      },
    });
    const project = await prisma.project.create({
      data: { name: 'Repository project', ownerId: user.id },
    });
    await prisma.projectMember.create({
      data: { projectId: project.id, userId: user.id, role: 'owner' },
    });
    projectId = project.id;
  });

  it('persists and retrieves a task', async () => {
    const task: Task = {
      id: randomUUID(),
      projectId,
      title: 'Learn Prisma repository',
      status: 'todo',
      version: 1,
      createdAt: new Date().toISOString(),
    };

    await expect(repository.save(task)).resolves.toEqual(task);
    await expect(repository.findById(task.id)).resolves.toEqual(task);
  });

  it('returns undefined for an unknown task', async () => {
    await expect(repository.findById(randomUUID())).resolves.toBeUndefined();
  });

  it('updates a task and creates an event in one transaction', async () => {
    const task: Task = {
      id: randomUUID(),
      projectId,
      title: 'Learn transactions',
      status: 'todo',
      version: 1,
      createdAt: new Date().toISOString(),
    };
    await repository.save(task);

    const result = await repository.updateStatus(task.id, 'in_progress', 1);

    expect(result).toMatchObject({
      kind: 'updated',
      task: { id: task.id, status: 'in_progress', version: 2 },
    });
    await expect(
      prisma.taskEvent.count({ where: { taskId: task.id } }),
    ).resolves.toBe(1);
    await expect(
      prisma.notificationJob.count({ where: { event: { taskId: task.id } } }),
    ).resolves.toBe(1);
  });

  it('returns a conflict without changing the task or adding an event', async () => {
    const task: Task = {
      id: randomUUID(),
      projectId,
      title: 'Learn compare and swap',
      status: 'todo',
      version: 1,
      createdAt: new Date().toISOString(),
    };
    await repository.save(task);

    await expect(repository.updateStatus(task.id, 'done', 2)).resolves.toEqual({
      kind: 'conflict',
    });
    await expect(repository.findById(task.id)).resolves.toEqual(task);
    await expect(
      prisma.taskEvent.count({ where: { taskId: task.id } }),
    ).resolves.toBe(0);
  });

  it('rolls back the task when event creation fails', async () => {
    const task: Task = {
      id: randomUUID(),
      projectId,
      title: 'Learn atomic transactions',
      status: 'todo',
      version: 1,
      createdAt: new Date().toISOString(),
    };
    await repository.save(task);
    await prisma.taskEvent.create({
      data: {
        taskId: task.id,
        fromStatus: 'todo',
        toStatus: 'in_progress',
        version: 2,
      },
    });

    await expect(
      repository.updateStatus(task.id, 'in_progress', 1),
    ).rejects.toThrow();
    await expect(repository.findById(task.id)).resolves.toEqual(task);
    await expect(
      prisma.taskEvent.count({ where: { taskId: task.id } }),
    ).resolves.toBe(1);
  });

  it('writes no notification job when the status transaction rolls back', async () => {
    const task: Task = {
      id: randomUUID(),
      projectId,
      title: 'Learn outbox atomicity',
      status: 'todo',
      version: 1,
      createdAt: new Date().toISOString(),
    };
    await repository.save(task);
    await prisma.taskEvent.create({
      data: {
        taskId: task.id,
        fromStatus: 'todo',
        toStatus: 'in_progress',
        version: 2,
      },
    });

    await expect(
      repository.updateStatus(task.id, 'in_progress', 1),
    ).rejects.toThrow();
    await expect(
      prisma.notificationJob.count({ where: { event: { taskId: task.id } } }),
    ).resolves.toBe(0);
  });

  it('processes the outbox and remains idempotent on repeated delivery', async () => {
    const task: Task = {
      id: randomUUID(),
      projectId,
      title: 'Learn asynchronous processing',
      status: 'todo',
      version: 1,
      createdAt: new Date().toISOString(),
    };
    await repository.save(task);
    await expect(
      repository.updateStatus(task.id, 'in_progress', 1),
    ).resolves.toMatchObject({
      kind: 'updated',
    });

    const processor = new NotificationProcessor(prisma);
    await processor.processPending();

    const firstCount = await prisma.notification.count({
      where: {
        taskEvent: { taskId: task.id },
        userId: (
          await prisma.projectMember.findFirstOrThrow({ where: { projectId } })
        ).userId,
      },
    });
    expect(firstCount).toBe(1);

    await prisma.notificationJob.updateMany({
      where: { event: { taskId: task.id } },
      data: { status: 'pending', availableAt: new Date() },
    });
    await processor.processPending();

    await expect(
      prisma.notification.count({ where: { taskEvent: { taskId: task.id } } }),
    ).resolves.toBe(1);
  });

  afterAll(async () => {
    await module.close();
  });
});
