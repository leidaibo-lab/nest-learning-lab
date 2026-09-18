import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { AuthenticatedUser } from '../auth/auth.types';
import type { FastifyRequest } from 'fastify';
import { ProjectRole } from './project';

type ProjectRequest = FastifyRequest & {
  user: AuthenticatedUser;
  projectRole?: ProjectRole;
  projectId?: string;
  tenantId: string;
};

const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

@Injectable()
export class ProjectAccessGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<ProjectRequest>();
    // 项目成员关系只在当前租户内有效，不能把全局 UUID 当作授权依据。
    const tenantId = request.tenantId;
    const projectId = await this.resolveProjectId(request);
    if (!projectId) {
      return true;
    }

    const membership = await this.prisma.projectMember.findUnique({
      where: {
        projectId_userId: { projectId, userId: request.user.id },
      },
      include: { project: { select: { tenantId: true } } },
    });
    if (!membership || membership.project.tenantId !== tenantId) {
      throw new ForbiddenException('你不是该项目的成员');
    }

    if (!['owner', 'member'].includes(membership.role)) {
      throw new ForbiddenException('项目角色无效');
    }
    request.projectId = projectId;
    request.projectRole = membership.role as ProjectRole;
    return true;
  }

  private async resolveProjectId(
    request: ProjectRequest,
  ): Promise<string | undefined> {
    const params = request.params as Record<string, string> | undefined;
    if (params?.id && request.url.startsWith('/projects/')) {
      return uuidPattern.test(params.id) ? params.id : undefined;
    }

    const body = request.body as { projectId?: string } | undefined;
    if (body?.projectId) {
      return uuidPattern.test(body.projectId) ? body.projectId : undefined;
    }

    if (params?.id) {
      if (!uuidPattern.test(params.id)) {
        return undefined;
      }
      const task = await this.prisma.task.findUnique({
        where: { id: params.id },
        // 这里只解析候选项目；真正的成员授权仍由上面的复合租户检查完成。
        select: {
          projectId: true,
          project: { select: { tenantId: true } },
        },
      });
      // 返回候选项目让统一成员检查产生 403；不把跨租户资源静默转换成“无项目”。
      return task?.projectId;
    }

    return undefined;
  }
}
