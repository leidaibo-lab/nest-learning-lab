import {
  Body,
  Controller,
  Param,
  ParseUUIDPipe,
  Post,
  UseGuards,
} from '@nestjs/common';
import { CurrentUser } from '../auth/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import type { AuthenticatedUser } from '../auth/auth.types';
import { ProjectAccessGuard } from './project-access.guard';
import { Project, ProjectMember } from './project';
import { AddMemberDto, CreateProjectDto } from './projects.dto';
import { ProjectsService } from './projects.service';
import { Roles } from './roles.decorator';
import { RolesGuard } from './roles.guard';

@Controller('projects')
export class ProjectsController {
  constructor(private readonly projectsService: ProjectsService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  create(
    @Body() input: CreateProjectDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<Project> {
    return this.projectsService.create(input, user.id);
  }

  @Post(':id/members')
  @UseGuards(JwtAuthGuard, ProjectAccessGuard, RolesGuard)
  @Roles('owner')
  addMember(
    @Param('id', new ParseUUIDPipe()) projectId: string,
    @Body() input: AddMemberDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<ProjectMember> {
    return this.projectsService.addMember(projectId, input, user.id);
  }
}
