import { Task, TaskStatus } from './task';

export const TASK_REPOSITORY = Symbol('TASK_REPOSITORY');

export interface TaskRepository {
  save(task: Task): Promise<Task>;
  findById(id: string): Promise<Task | undefined>;
  updateStatus(
    id: string,
    status: TaskStatus,
    expectedVersion: number,
  ): Promise<TaskUpdateResult>;
}

export type TaskUpdateResult =
  | { kind: 'updated'; task: Task }
  | { kind: 'not_found' }
  | { kind: 'conflict' };
