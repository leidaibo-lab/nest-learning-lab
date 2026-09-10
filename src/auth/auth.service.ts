import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Prisma } from '../../generated/prisma';
import { PrismaService } from '../database/prisma.service';
import { CredentialsDto } from './auth.dto';
import { AuthenticatedUser } from './auth.types';
import { PasswordService } from './password.service';

const dummyPasswordHash =
  '$argon2id$v=19$m=19456,p=1,t=2$rW+D5IuD6RV6ZxJOPdIK4g$k/hYZhmz1sTXCUKx0OaLGCAK8P3V+DRtdGpJK+bGI5M';

export interface AuthResponse {
  user: AuthenticatedUser;
  accessToken: string;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly passwordService: PasswordService,
    private readonly jwtService: JwtService,
  ) {}

  async register(input: CredentialsDto): Promise<AuthResponse> {
    const passwordHash = await this.passwordService.hash(input.password);
    try {
      const user = await this.prisma.user.create({
        data: { email: input.email, passwordHash },
      });
      return this.toResponse(user.id, user.email);
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException('邮箱已经注册');
      }
      throw error;
    }
  }

  async login(input: CredentialsDto): Promise<AuthResponse> {
    const user = await this.prisma.user.findUnique({
      where: { email: input.email },
    });
    const passwordHash = user?.passwordHash ?? dummyPasswordHash;
    const valid = await this.passwordService.verify(
      input.password,
      passwordHash,
    );

    if (!user || !valid) {
      throw new UnauthorizedException('邮箱或密码错误');
    }

    if (this.passwordService.needsRehash(user.passwordHash)) {
      await this.prisma.user.update({
        where: { id: user.id },
        data: {
          passwordHash: await this.passwordService.hash(input.password),
        },
      });
    }

    return this.toResponse(user.id, user.email);
  }

  private async toResponse(id: string, email: string): Promise<AuthResponse> {
    const user = { id, email };
    const accessToken = await this.jwtService.signAsync({}, { subject: id });
    return { user, accessToken };
  }
}
