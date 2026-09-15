export interface Notification {
  id: string;
  taskEventId: string;
  kind: 'task.status_changed';
  payload: {
    taskId: string;
    fromStatus: string;
    toStatus: string;
    version: number;
  };
  createdAt: string;
}
