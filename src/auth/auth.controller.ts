import { Body, Controller, HttpCode, Post } from '@nestjs/common';
import { AuthResponse, AuthService } from './auth.service';
import { CredentialsDto } from './auth.dto';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  register(@Body() input: CredentialsDto): Promise<AuthResponse> {
    return this.authService.register(input);
  }

  @Post('login')
  @HttpCode(200)
  login(@Body() input: CredentialsDto): Promise<AuthResponse> {
    return this.authService.login(input);
  }
}
