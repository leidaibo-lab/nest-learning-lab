import { Module } from '@nestjs/common';
import { InMemoryTaskRepository } from './in-memory-task.repository';
import { TASK_REPOSITORY } from './task.repository';
import { TasksController } from './tasks.controller';
import { TasksService } from './tasks.service';

@Module({
  controllers: [TasksController],
  providers: [
    TasksService,
    {
      provide: TASK_REPOSITORY,
      useClass: InMemoryTaskRepository,
    },
  ],
})
export class TasksModule {}
