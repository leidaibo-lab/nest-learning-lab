export type TaskStatus = 'todo' | 'in_progress' | 'done';

export interface Task {
  id: string;
  projectId: string;
  title: string;
  status: TaskStatus;
  version: number;
  createdAt: string;
}
