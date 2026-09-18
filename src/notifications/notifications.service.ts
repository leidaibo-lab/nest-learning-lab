import { Injectable } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { Notification } from './notification';

@Injectable()
export class NotificationsService {
  constructor(private readonly prisma: PrismaService) {}

  async listForUser(userId: string, tenantId: string): Promise<Notification[]> {
    const notifications = await this.prisma.notification.findMany({
      where: { userId, tenantId },
      orderBy: { createdAt: 'desc' },
    });

    return notifications.map((notification) => {
      const payload = notification.payload;
      if (
        typeof payload !== 'object' ||
        payload === null ||
        Array.isArray(payload)
      ) {
        throw new Error('通知负载格式无效');
      }

      return {
        id: notification.id,
        taskEventId: notification.taskEventId,
        tenantId: notification.tenantId,
        kind: 'task.status_changed',
        payload: {
          taskId: this.readString(payload, 'taskId'),
          tenantId: this.readString(payload, 'tenantId'),
          fromStatus: this.readString(payload, 'fromStatus'),
          toStatus: this.readString(payload, 'toStatus'),
          version: this.readNumber(payload, 'version'),
        },
        createdAt: notification.createdAt.toISOString(),
      };
    });
  }

  private readString(payload: object, key: string): string {
    const value = (payload as Record<string, unknown>)[key];
    if (typeof value !== 'string') {
      throw new Error(`通知负载缺少字符串字段: ${key}`);
    }
    return value;
  }

  private readNumber(payload: object, key: string): number {
    const value = (payload as Record<string, unknown>)[key];
    if (typeof value !== 'number') {
      throw new Error(`通知负载缺少数字字段: ${key}`);
    }
    return value;
  }
}
