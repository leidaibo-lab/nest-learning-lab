import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ProjectAccessGuard } from '../projects/project-access.guard';
import { CreateTaskDto } from './create-task.dto';
import { Task } from './task';
import { TasksService } from './tasks.service';
import { UpdateTaskStatusDto } from './update-task-status.dto';

@Controller('tasks')
@UseGuards(JwtAuthGuard, ProjectAccessGuard)
export class TasksController {
  constructor(private readonly tasksService: TasksService) {}

  @Post()
  create(@Body() input: CreateTaskDto): Promise<Task> {
    return this.tasksService.create(input);
  }

  @Get(':id')
  findById(@Param('id', new ParseUUIDPipe()) id: string): Promise<Task> {
    return this.tasksService.findById(id);
  }

  @Patch(':id/status')
  updateStatus(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() input: UpdateTaskStatusDto,
  ): Promise<Task> {
    return this.tasksService.updateStatus(
      id,
      input.status,
      input.expectedVersion,
    );
  }
}
