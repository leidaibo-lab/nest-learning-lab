import { Task } from './task';

export const TASK_REPOSITORY = Symbol('TASK_REPOSITORY');

export interface TaskRepository {
  save(task: Task): Promise<Task>;
  findById(id: string): Promise<Task | undefined>;
}
