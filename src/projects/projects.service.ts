import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '../../generated/prisma';
import { PrismaService } from '../database/prisma.service';
import { AddMemberDto, CreateProjectDto } from './projects.dto';
import { Project, ProjectMember, ProjectRole } from './project';

@Injectable()
export class ProjectsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(input: CreateProjectDto, ownerId: string): Promise<Project> {
    const project = await this.prisma.$transaction(async (transaction) => {
      const created = await transaction.project.create({
        data: { name: input.name, ownerId },
      });
      await transaction.projectMember.create({
        data: { projectId: created.id, userId: ownerId, role: 'owner' },
      });
      return created;
    });

    return this.toProject(project);
  }

  async addMember(
    projectId: string,
    input: AddMemberDto,
    ownerId: string,
  ): Promise<ProjectMember> {
    const ownerMembership = await this.prisma.projectMember.findUnique({
      where: { projectId_userId: { projectId, userId: ownerId } },
    });
    if (ownerMembership?.role !== 'owner') {
      throw new ForbiddenException('只有项目所有者可以管理成员');
    }

    const user = await this.prisma.user.findUnique({
      where: { email: input.email },
    });
    if (!user) {
      throw new NotFoundException('用户不存在');
    }

    try {
      const member = await this.prisma.projectMember.create({
        data: { projectId, userId: user.id, role: 'member' },
      });
      return this.toMember(member.projectId, member.userId, member.role);
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException('用户已经是项目成员');
      }
      throw error;
    }
  }

  private toProject(project: {
    id: string;
    name: string;
    ownerId: string;
    createdAt: Date;
  }): Project {
    return {
      id: project.id,
      name: project.name,
      ownerId: project.ownerId,
      createdAt: project.createdAt.toISOString(),
    };
  }

  private toMember(
    projectId: string,
    userId: string,
    role: string,
  ): ProjectMember {
    if (!['owner', 'member'].includes(role)) {
      throw new Error(`不支持的项目角色: ${role}`);
    }
    return { projectId, userId, role: role as ProjectRole };
  }
}
