import { Task, TaskStatus } from './task';

export const TASK_REPOSITORY = Symbol('TASK_REPOSITORY');

export interface TaskRepository {
  save(task: Task, tenantId: string): Promise<Task>;
  findById(id: string, tenantId: string): Promise<Task | undefined>;
  updateStatus(
    id: string,
    status: TaskStatus,
    expectedVersion: number,
    tenantId: string,
  ): Promise<TaskUpdateResult>;
}

export type TaskUpdateResult =
  | { kind: 'updated'; task: Task }
  | { kind: 'not_found' }
  | { kind: 'conflict' };
