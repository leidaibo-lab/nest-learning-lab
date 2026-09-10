import { SetMetadata } from '@nestjs/common';
import { ProjectRole } from './project';

export const PROJECT_ROLES_KEY = 'project_roles';
export const Roles = (...roles: ProjectRole[]) =>
  SetMetadata(PROJECT_ROLES_KEY, roles);
