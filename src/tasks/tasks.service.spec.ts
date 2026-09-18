import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { TASK_REPOSITORY, TaskRepository } from './task.repository';
import { TasksService } from './tasks.service';
import { NotificationScheduler } from '../notifications/notification.scheduler';

describe('TasksService', () => {
  let service: TasksService;
  let repository: jest.Mocked<TaskRepository>;
  let notificationScheduler: jest.Mocked<NotificationScheduler>;

  beforeEach(async () => {
    repository = {
      save: jest.fn(),
      findById: jest.fn(),
      updateStatus: jest.fn(),
    };
    notificationScheduler = { schedule: jest.fn() };
    repository.save.mockImplementation((task) => Promise.resolve(task));

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TasksService,
        {
          provide: TASK_REPOSITORY,
          useValue: repository,
        },
        {
          provide: NotificationScheduler,
          useValue: notificationScheduler,
        },
      ],
    }).compile();

    service = module.get<TasksService>(TasksService);
  });

  it('creates a task with normalized title and initial fields', async () => {
    const task = await service.create(
      {
        projectId: 'project-1',
        title: '  Learn NestJS  ',
      },
      'tenant-1',
    );

    expect(task).toEqual({
      id: expect.any(String) as string,
      projectId: 'project-1',
      title: 'Learn NestJS',
      status: 'todo',
      version: 1,
      createdAt: expect.any(String) as string,
    });
  });

  it('finds a previously created task', async () => {
    const created = await service.create(
      {
        projectId: 'project-1',
        title: 'Learn providers',
      },
      'tenant-1',
    );
    repository.findById.mockResolvedValue(created);

    await expect(service.findById(created.id, 'tenant-1')).resolves.toEqual(
      created,
    );
  });

  it('rejects an unknown task id', async () => {
    repository.findById.mockResolvedValue(undefined);

    await expect(service.findById('missing', 'tenant-1')).rejects.toThrow(
      NotFoundException,
    );
  });

  it('updates a task status and increments its version', async () => {
    const created = await service.create(
      {
        projectId: 'project-1',
        title: 'Learn transactions',
      },
      'tenant-1',
    );
    const updated = { ...created, status: 'in_progress' as const, version: 2 };
    repository.findById.mockResolvedValue(created);
    repository.updateStatus.mockResolvedValue({
      kind: 'updated',
      task: updated,
    });

    await expect(
      service.updateStatus(
        created.id,
        'in_progress',
        created.version,
        'tenant-1',
      ),
    ).resolves.toEqual(updated);
    expect(repository.updateStatus.mock.calls).toContainEqual([
      created.id,
      'in_progress',
      created.version,
      'tenant-1',
    ]);
    expect(notificationScheduler.schedule.mock.calls).toHaveLength(1);
  });

  it('rejects an outdated version', async () => {
    const created = await service.create(
      {
        projectId: 'project-1',
        title: 'Learn optimistic locks',
      },
      'tenant-1',
    );
    repository.findById.mockResolvedValue({
      ...created,
      status: 'in_progress',
      version: 2,
    });

    await expect(
      service.updateStatus(created.id, 'done', created.version, 'tenant-1'),
    ).rejects.toThrow(ConflictException);
    expect(repository.updateStatus.mock.calls).toHaveLength(0);
  });

  it('rejects a transition from done', async () => {
    const created = await service.create(
      {
        projectId: 'project-1',
        title: 'Complete the lesson',
      },
      'tenant-1',
    );
    const done = { ...created, status: 'done' as const, version: 3 };
    repository.findById.mockResolvedValue(done);

    await expect(
      service.updateStatus(done.id, 'todo', done.version, 'tenant-1'),
    ).rejects.toThrow(BadRequestException);
    expect(repository.updateStatus.mock.calls).toHaveLength(0);
  });
});
