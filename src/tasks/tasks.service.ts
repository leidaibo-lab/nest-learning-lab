import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { CreateTaskDto } from './create-task.dto';
import { Task, TaskStatus } from './task';
import { TASK_REPOSITORY } from './task.repository';
import type { TaskRepository } from './task.repository';

const allowedTransitions: Record<TaskStatus, readonly TaskStatus[]> = {
  todo: ['in_progress', 'done'],
  in_progress: ['todo', 'done'],
  done: [],
};

@Injectable()
export class TasksService {
  constructor(
    @Inject(TASK_REPOSITORY)
    private readonly taskRepository: TaskRepository,
  ) {}

  async create(input: CreateTaskDto): Promise<Task> {
    const task: Task = {
      id: randomUUID(),
      projectId: input.projectId,
      title: input.title.trim(),
      status: 'todo',
      version: 1,
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

  async updateStatus(
    id: string,
    status: TaskStatus,
    expectedVersion: number,
  ): Promise<Task> {
    const current = await this.findById(id);

    if (!allowedTransitions[current.status].includes(status)) {
      throw new BadRequestException(
        `不允许将任务从 ${current.status} 更新为 ${status}`,
      );
    }

    if (current.version !== expectedVersion) {
      throw new ConflictException('任务版本已过期，请重新获取后再更新');
    }

    const result = await this.taskRepository.updateStatus(
      id,
      status,
      expectedVersion,
    );

    if (result.kind === 'not_found') {
      throw new NotFoundException(`任务 ${id} 不存在`);
    }

    if (result.kind === 'conflict') {
      throw new ConflictException('任务版本已过期，请重新获取后再更新');
    }

    return result.task;
  }
}
