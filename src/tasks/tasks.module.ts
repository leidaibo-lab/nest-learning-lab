import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { ProjectAccessGuard } from '../projects/project-access.guard';
import { PrismaTaskRepository } from './prisma-task.repository';
import { TASK_REPOSITORY } from './task.repository';
import { TasksController } from './tasks.controller';
import { TasksService } from './tasks.service';
import { TenantsModule } from '../tenants/tenants.module';

@Module({
  imports: [AuthModule, NotificationsModule, TenantsModule],
  controllers: [TasksController],
  providers: [
    TasksService,
    {
      provide: TASK_REPOSITORY,
      useClass: PrismaTaskRepository,
    },
    ProjectAccessGuard,
  ],
})
export class TasksModule {}
