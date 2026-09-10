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
};

const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

@Injectable()
export class ProjectAccessGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<ProjectRequest>();
    const projectId = await this.resolveProjectId(request);
    if (!projectId) {
      return true;
    }

    const membership = await this.prisma.projectMember.findUnique({
      where: {
        projectId_userId: { projectId, userId: request.user.id },
      },
    });
    if (!membership) {
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
        select: { projectId: true },
      });
      return task?.projectId;
    }

    return undefined;
  }
}
