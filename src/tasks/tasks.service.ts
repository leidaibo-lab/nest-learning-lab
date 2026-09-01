import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { CreateTaskDto } from './create-task.dto';
import { Task } from './task';
import { TASK_REPOSITORY } from './task.repository';
import type { TaskRepository } from './task.repository';

@Injectable()
export class TasksService {
  constructor(
    @Inject(TASK_REPOSITORY)
    private readonly taskRepository: TaskRepository,
  ) {}

  async create(input: CreateTaskDto): Promise<Task> {
    const task: Task = {
      id: randomUUID(),
      title: input.title.trim(),
      status: 'todo',
      createdAt: new Date().toISOString(),
    };

    return this.taskRepository.save(task);
  }

  async findById(id: string): Promise<Task> {
    const task = await this.taskRepository.findById(id);

    if (!task) {
      throw new NotFoundException(`任务 ${id} 不存在`);
    }

    return task;
  }
}
