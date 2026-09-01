import { Injectable } from '@nestjs/common';
import { TaskRepository } from './task.repository';
import { Task } from './task';

@Injectable()
export class InMemoryTaskRepository implements TaskRepository {
  private readonly tasks = new Map<string, Task>();

  save(task: Task): Promise<Task> {
    this.tasks.set(task.id, task);
    return Promise.resolve(task);
  }

  findById(id: string): Promise<Task | undefined> {
    return Promise.resolve(this.tasks.get(id));
  }
}
