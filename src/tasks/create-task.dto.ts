import { Transform } from 'class-transformer';
import { IsNotEmpty, IsString, IsUUID, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateTaskDto {
  @ApiProperty({ format: 'uuid', description: '所属项目 UUID' })
  @IsUUID()
  projectId!: string;

  @Transform(({ value }) =>
    typeof value === 'string' ? value.trim() : (value as unknown),
  )
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  @ApiProperty({
    example: '学习 NestJS Guard',
    maxLength: 120,
    description: '任务标题',
  })
  title!: string;
}
