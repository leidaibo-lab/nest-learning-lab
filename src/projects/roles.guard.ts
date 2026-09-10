import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ProjectRole } from './project';
import { PROJECT_ROLES_KEY } from './roles.decorator';
import type { FastifyRequest } from 'fastify';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const roles = this.reflector.getAllAndOverride<ProjectRole[]>(
      PROJECT_ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );
    if (!roles?.length) {
      return true;
    }

    const request = context
      .switchToHttp()
      .getRequest<FastifyRequest & { projectRole?: ProjectRole }>();
    if (!request.projectRole || !roles.includes(request.projectRole)) {
      throw new ForbiddenException('没有执行该操作的项目权限');
    }
    return true;
  }
}
