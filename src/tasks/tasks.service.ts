import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { CreateTaskDto } from './create-task.dto';
import { NotificationScheduler } from '../notifications/notification.scheduler';
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
    private readonly notificationScheduler: NotificationScheduler,
  ) {}

  async create(input: CreateTaskDto, tenantId: string): Promise<Task> {
    const task: Task = {
      id: randomUUID(),
      projectId: input.projectId,
      title: input.title.trim(),
      status: 'todo',
      version: 1,
      createdAt: new Date().toISOString(),
    };

    return this.taskRepository.save(task, tenantId);
  }

  async findById(id: string, tenantId: string): Promise<Task> {
    const task = await this.taskRepository.findById(id, tenantId);

    if (!task) {
      throw new NotFoundException(`任务 ${id} 不存在`);
    }

    return task;
  }

  async updateStatus(
    id: string,
    status: TaskStatus,
    expectedVersion: number,
    tenantId: string,
  ): Promise<Task> {
    const current = await this.findById(id, tenantId);

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
      tenantId,
    );

    if (result.kind === 'not_found') {
      throw new NotFoundException(`任务 ${id} 不存在`);
    }

    if (result.kind === 'conflict') {
      throw new ConflictException('任务版本已过期，请重新获取后再更新');
    }

    // 事务已经提交后才触发后台扫描；通知失败不会把已成功的状态更新改成失败。
    this.notificationScheduler.schedule();
    return result.task;
  }
}
