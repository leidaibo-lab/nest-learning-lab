import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { ProjectAccessGuard } from './project-access.guard';
import { ProjectsController } from './projects.controller';
import { ProjectsService } from './projects.service';
import { RolesGuard } from './roles.guard';

@Module({
  imports: [AuthModule],
  controllers: [ProjectsController],
  providers: [ProjectsService, ProjectAccessGuard, RolesGuard],
})
export class ProjectsModule {}
