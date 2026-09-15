import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { NotificationProcessor } from './notification.processor';
import { NotificationScheduler } from './notification.scheduler';
import { NotificationsController } from './notifications.controller';
import { NotificationsService } from './notifications.service';

@Module({
  imports: [AuthModule],
  controllers: [NotificationsController],
  providers: [
    NotificationsService,
    NotificationProcessor,
    NotificationScheduler,
  ],
  exports: [NotificationScheduler],
})
export class NotificationsModule {}
