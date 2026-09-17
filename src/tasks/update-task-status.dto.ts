import { Type } from 'class-transformer';
import { IsEnum, IsInt, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import type { TaskStatus } from './task';

export class UpdateTaskStatusDto {
  @ApiProperty({
    enum: ['todo', 'in_progress', 'done'],
    example: 'in_progress',
  })
  @IsEnum(['todo', 'in_progress', 'done'])
  status!: TaskStatus;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @ApiProperty({
    example: 1,
    minimum: 1,
    description: '客户端读取到的任务版本',
  })
  expectedVersion!: number;
}
