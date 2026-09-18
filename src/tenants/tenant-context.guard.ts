import {
  BadRequestException,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import type { FastifyRequest } from 'fastify';
import { PrismaService } from '../database/prisma.service';
import type { AuthenticatedUser } from '../auth/auth.types';

type TenantRequest = FastifyRequest & {
  user: AuthenticatedUser;
  tenantId?: string;
};

const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

@Injectable()
export class TenantContextGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<TenantRequest>();
    const header = request.headers['x-tenant-id'];
    if (Array.isArray(header)) {
      throw new BadRequestException('x-tenant-id 只能提供一个租户 UUID');
    }
    const tenantId = header;

    if (tenantId !== undefined) {
      if (!uuidPattern.test(tenantId)) {
        throw new BadRequestException('x-tenant-id 必须是合法的租户 UUID');
      }
      await this.assertMembership(request.user.id, tenantId);
      request.tenantId = tenantId;
      return true;
    }

    const memberships = await this.prisma.tenantMember.findMany({
      where: { userId: request.user.id },
      select: { tenantId: true },
      orderBy: { createdAt: 'asc' },
    });
    if (memberships.length === 0) {
      throw new ForbiddenException('用户没有可用租户');
    }
    if (memberships.length > 1) {
      throw new BadRequestException('用户属于多个租户，请提供 x-tenant-id');
    }

    // 单租户回退帮助旧客户端平滑接入；多租户场景必须显式选择边界。
    request.tenantId = memberships[0].tenantId;
    return true;
  }

  private async assertMembership(userId: string, tenantId: string) {
    const membership = await this.prisma.tenantMember.findUnique({
      where: { tenantId_userId: { tenantId, userId } },
    });
    if (!membership) {
      throw new ForbiddenException('你不是该租户的成员');
    }
  }
}
