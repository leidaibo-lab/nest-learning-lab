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
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ProjectAccessGuard } from '../projects/project-access.guard';
import { CreateTaskDto } from './create-task.dto';
import { Task } from './task';
import { TasksService } from './tasks.service';
import { UpdateTaskStatusDto } from './update-task-status.dto';

@Controller('tasks')
@UseGuards(JwtAuthGuard, ProjectAccessGuard)
@ApiTags('任务')
@ApiBearerAuth()
export class TasksController {
  constructor(private readonly tasksService: TasksService) {}

  @Post()
  @ApiOperation({ summary: '创建任务' })
  @ApiCreatedResponse({ description: '任务创建成功' })
  @ApiBadRequestResponse({ description: '请求参数非法' })
  @ApiForbiddenResponse({ description: '不是项目成员' })
  @ApiUnauthorizedResponse({ description: '未认证' })
  create(@Body() input: CreateTaskDto): Promise<Task> {
    return this.tasksService.create(input);
  }

  @Get(':id')
  @ApiOperation({ summary: '查询任务' })
  @ApiParam({ name: 'id', description: '任务 UUID' })
  @ApiNotFoundResponse({ description: '任务不存在' })
  @ApiForbiddenResponse({ description: '不是项目成员' })
  @ApiUnauthorizedResponse({ description: '未认证' })
  findById(@Param('id', new ParseUUIDPipe()) id: string): Promise<Task> {
    return this.tasksService.findById(id);
  }

  @Patch(':id/status')
  @ApiOperation({ summary: '更新任务状态' })
  @ApiParam({ name: 'id', description: '任务 UUID' })
  @ApiBadRequestResponse({ description: '状态转换或请求参数非法' })
  @ApiConflictResponse({ description: '任务版本冲突' })
  @ApiNotFoundResponse({ description: '任务不存在' })
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
