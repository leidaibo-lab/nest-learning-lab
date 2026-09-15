import { Injectable } from '@nestjs/common';
import { NotificationProcessor } from './notification.processor';

@Injectable()
export class NotificationScheduler {
  constructor(private readonly processor: NotificationProcessor) {}

  schedule(): void {
    this.processor.schedule();
  }
}
