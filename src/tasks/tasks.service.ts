import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
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
    const title = typeof input.title === 'string' ? input.title.trim() : '';

    if (!title) {
      throw new BadRequestException('任务标题不能为空');
    }

    const task: Task = {
      id: randomUUID(),
      title,
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
