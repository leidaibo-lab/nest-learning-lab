import { NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { InMemoryTaskRepository } from './in-memory-task.repository';
import { TASK_REPOSITORY } from './task.repository';
import { TasksService } from './tasks.service';

describe('TasksService', () => {
  let service: TasksService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TasksService,
        {
          provide: TASK_REPOSITORY,
          useClass: InMemoryTaskRepository,
        },
      ],
    }).compile();

    service = module.get<TasksService>(TasksService);
  });

  it('creates a task with normalized title and initial fields', async () => {
    const task = await service.create({ title: '  Learn NestJS  ' });

    expect(task).toEqual({
      id: expect.any(String) as string,
      title: 'Learn NestJS',
      status: 'todo',
      createdAt: expect.any(String) as string,
    });
  });

  it('finds a previously created task', async () => {
    const created = await service.create({ title: 'Learn providers' });

    await expect(service.findById(created.id)).resolves.toEqual(created);
  });

  it('rejects an unknown task id', async () => {
    await expect(service.findById('missing')).rejects.toThrow(
      NotFoundException,
    );
  });
});
