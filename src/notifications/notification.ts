export interface Notification {
  id: string;
  taskEventId: string;
  tenantId: string;
  kind: 'task.status_changed';
  payload: {
    taskId: string;
    tenantId: string;
    fromStatus: string;
    toStatus: string;
    version: number;
  };
  createdAt: string;
}
