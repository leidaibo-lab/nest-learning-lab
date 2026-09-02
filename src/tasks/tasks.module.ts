import { Module } from '@nestjs/common';
import { PrismaTaskRepository } from './prisma-task.repository';
import { TASK_REPOSITORY } from './task.repository';
import { TasksController } from './tasks.controller';
import { TasksService } from './tasks.service';

@Module({
  controllers: [TasksController],
  providers: [
    TasksService,
    {
      provide: TASK_REPOSITORY,
      useClass: PrismaTaskRepository,
    },
  ],
})
export class TasksModule {}
