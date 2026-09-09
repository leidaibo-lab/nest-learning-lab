import { Injectable } from '@nestjs/common';
import type { Task as PrismaTask } from '../../generated/prisma';
import { PrismaService } from '../database/prisma.service';
import { Task, TaskStatus } from './task';
import type { TaskRepository, TaskUpdateResult } from './task.repository';

@Injectable()
export class PrismaTaskRepository implements TaskRepository {
  constructor(private readonly prisma: PrismaService) {}

  async save(task: Task): Promise<Task> {
    const saved = await this.prisma.task.create({
      data: {
        id: task.id,
        title: task.title,
        status: task.status,
        version: task.version,
        createdAt: new Date(task.createdAt),
      },
    });

    return this.toDomain(saved);
  }

  async findById(id: string): Promise<Task | undefined> {
    const task = await this.prisma.task.findUnique({ where: { id } });
    return task ? this.toDomain(task) : undefined;
  }

  async updateStatus(
    id: string,
    status: TaskStatus,
    expectedVersion: number,
  ): Promise<TaskUpdateResult> {
    return this.prisma.$transaction(async (transaction) => {
      const current = await transaction.task.findUnique({ where: { id } });

      if (!current) {
        return { kind: 'not_found' };
      }

      if (current.version !== expectedVersion) {
        return { kind: 'conflict' };
      }

      const updateResult = await transaction.task.updateMany({
        where: { id, version: expectedVersion },
        data: {
          status,
          version: { increment: 1 },
        },
      });

      if (updateResult.count !== 1) {
        return { kind: 'conflict' };
      }

      await transaction.taskEvent.create({
        data: {
          taskId: id,
          fromStatus: current.status,
          toStatus: status,
          version: expectedVersion + 1,
        },
      });

      const updated = await transaction.task.findUnique({ where: { id } });

      if (!updated) {
        return { kind: 'conflict' };
      }

      return { kind: 'updated', task: this.toDomain(updated) };
    });
  }

  private toDomain(task: PrismaTask): Task {
    if (!['todo', 'in_progress', 'done'].includes(task.status)) {
      throw new Error(`不支持的任务状态: ${task.status}`);
    }

    return {
      id: task.id,
      title: task.title,
      status: task.status as TaskStatus,
      version: task.version,
      createdAt: task.createdAt.toISOString(),
    };
  }
}
