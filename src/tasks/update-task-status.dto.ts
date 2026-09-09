import { Type } from 'class-transformer';
import { IsEnum, IsInt, Min } from 'class-validator';
import type { TaskStatus } from './task';

export class UpdateTaskStatusDto {
  @IsEnum(['todo', 'in_progress', 'done'])
  status!: TaskStatus;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  expectedVersion!: number;
}
