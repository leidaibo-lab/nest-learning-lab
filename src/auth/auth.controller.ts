import { Body, Controller, HttpCode, Post } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiTooManyRequestsResponse,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { AuthResponse, AuthService } from './auth.service';
import { CredentialsDto } from './auth.dto';

@Controller('auth')
@ApiTags('认证')
@Throttle({ default: { limit: 5, ttl: 60_000 } })
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  @ApiOperation({ summary: '注册用户' })
  @ApiCreatedResponse({ description: '用户创建成功并返回访问令牌' })
  @ApiBadRequestResponse({ description: '请求参数非法' })
  @ApiTooManyRequestsResponse({ description: '认证入口请求过于频繁' })
  register(@Body() input: CredentialsDto): Promise<AuthResponse> {
    return this.authService.register(input);
  }

  @Post('login')
  @HttpCode(200)
  @ApiOperation({ summary: '用户登录' })
  @ApiOkResponse({ description: '登录成功并返回访问令牌' })
  @ApiUnauthorizedResponse({ description: '邮箱或密码错误' })
  @ApiBadRequestResponse({ description: '请求参数非法' })
  @ApiTooManyRequestsResponse({ description: '认证入口请求过于频繁' })
  login(@Body() input: CredentialsDto): Promise<AuthResponse> {
    return this.authService.login(input);
  }
}
