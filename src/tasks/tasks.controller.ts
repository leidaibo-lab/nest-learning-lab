import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { CreateTaskDto } from './create-task.dto';
import { Task } from './task';
import { TasksService } from './tasks.service';

@Controller('tasks')
export class TasksController {
  constructor(private readonly tasksService: TasksService) {}

  @Post()
  create(@Body() input: CreateTaskDto): Promise<Task> {
    return this.tasksService.create(input);
  }

  @Get(':id')
  findById(@Param('id') id: string): Promise<Task> {
    return this.tasksService.findById(id);
  }
}
