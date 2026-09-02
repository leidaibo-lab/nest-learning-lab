import { Injectable } from '@nestjs/common';
import type { Task as PrismaTask } from '../../generated/prisma';
import { PrismaService } from '../database/prisma.service';
import { Task } from './task';
import type { TaskRepository } from './task.repository';

@Injectable()
export class PrismaTaskRepository implements TaskRepository {
  constructor(private readonly prisma: PrismaService) {}

  async save(task: Task): Promise<Task> {
    const saved = await this.prisma.task.create({
      data: {
        id: task.id,
        title: task.title,
        status: task.status,
        createdAt: new Date(task.createdAt),
      },
    });

    return this.toDomain(saved);
  }

  async findById(id: string): Promise<Task | undefined> {
    const task = await this.prisma.task.findUnique({ where: { id } });
    return task ? this.toDomain(task) : undefined;
  }

  private toDomain(task: PrismaTask): Task {
    if (task.status !== 'todo') {
      throw new Error(`不支持的任务状态: ${task.status}`);
    }

    return {
      id: task.id,
      title: task.title,
      status: task.status,
      createdAt: task.createdAt.toISOString(),
    };
  }
}
