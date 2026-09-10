import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import type { FastifyRequest } from 'fastify';
import { PrismaService } from '../database/prisma.service';
import { AuthenticatedUser } from './auth.types';

type AuthenticatedRequest = FastifyRequest & { user: AuthenticatedUser };

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly jwtService: JwtService,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const authorization = request.headers.authorization;
    if (!authorization?.startsWith('Bearer ')) {
      throw new UnauthorizedException('需要 Bearer Token');
    }

    try {
      const claims = await this.jwtService.verifyAsync<{ sub?: string }>(
        authorization.slice(7),
      );
      if (!claims.sub) {
        throw new Error('JWT 缺少 subject');
      }
      const user = await this.prisma.user.findUnique({
        where: { id: claims.sub },
        select: { id: true, email: true },
      });
      if (!user) {
        throw new Error('用户不存在');
      }
      request.user = user;
      return true;
    } catch {
      throw new UnauthorizedException('认证令牌无效');
    }
  }
}
