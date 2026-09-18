import {
  Body,
  Controller,
  Param,
  ParseUUIDPipe,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiHeader,
  ApiOperation,
  ApiParam,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { CurrentUser } from '../auth/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import type { AuthenticatedUser } from '../auth/auth.types';
import { ProjectAccessGuard } from './project-access.guard';
import { Project, ProjectMember } from './project';
import { AddMemberDto, CreateProjectDto } from './projects.dto';
import { ProjectsService } from './projects.service';
import { Roles } from './roles.decorator';
import { RolesGuard } from './roles.guard';
import { CurrentTenant } from '../tenants/current-tenant.decorator';
import { TenantContextGuard } from '../tenants/tenant-context.guard';

@Controller('projects')
@ApiTags('项目')
@ApiBearerAuth()
@ApiHeader({
  name: 'x-tenant-id',
  required: false,
  description: '当前租户 UUID；多租户用户必须提供，单租户用户可省略',
})
export class ProjectsController {
  constructor(private readonly projectsService: ProjectsService) {}

  @Post()
  @UseGuards(JwtAuthGuard, TenantContextGuard)
  @ApiOperation({ summary: '创建项目' })
  @ApiCreatedResponse({ description: '项目创建成功' })
  @ApiUnauthorizedResponse({ description: '未认证' })
  create(
    @Body() input: CreateProjectDto,
    @CurrentUser() user: AuthenticatedUser,
    @CurrentTenant() tenantId: string,
  ): Promise<Project> {
    return this.projectsService.create(input, user.id, tenantId);
  }

  @Post(':id/members')
  @UseGuards(JwtAuthGuard, TenantContextGuard, ProjectAccessGuard, RolesGuard)
  @Roles('owner')
  @ApiOperation({ summary: '添加项目成员' })
  @ApiParam({ name: 'id', description: '项目 UUID' })
  @ApiCreatedResponse({ description: '成员添加成功' })
  @ApiForbiddenResponse({ description: '没有项目成员管理权限' })
  @ApiUnauthorizedResponse({ description: '未认证' })
  addMember(
    @Param('id', new ParseUUIDPipe()) projectId: string,
    @Body() input: AddMemberDto,
    @CurrentUser() user: AuthenticatedUser,
    @CurrentTenant() tenantId: string,
  ): Promise<ProjectMember> {
    return this.projectsService.addMember(projectId, input, user.id, tenantId);
  }
}
