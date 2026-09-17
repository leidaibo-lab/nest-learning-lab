import { Transform } from 'class-transformer';
import { IsEmail, IsString, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CredentialsDto {
  @ApiProperty({ example: 'user@example.com', description: '用户邮箱' })
  @Transform(({ value }) =>
    typeof value === 'string' ? value.trim().toLowerCase() : (value as unknown),
  )
  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(8)
  @ApiProperty({
    example: 'password123',
    minLength: 8,
    description: '用户密码',
  })
  password!: string;
}
