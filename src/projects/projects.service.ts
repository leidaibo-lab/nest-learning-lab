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

  async create(
    input: CreateProjectDto,
    ownerId: string,
    tenantId: string,
  ): Promise<Project> {
    const project = await this.prisma.$transaction(async (transaction) => {
      const created = await transaction.project.create({
        data: { name: input.name, ownerId, tenantId },
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
    tenantId: string,
  ): Promise<ProjectMember> {
    const ownerMembership = await this.prisma.projectMember.findUnique({
      where: { projectId_userId: { projectId, userId: ownerId } },
      include: { project: { select: { tenantId: true } } },
    });
    if (
      ownerMembership?.role !== 'owner' ||
      ownerMembership.project.tenantId !== tenantId
    ) {
      throw new ForbiddenException('只有项目所有者可以管理成员');
    }

    const user = await this.prisma.user.findUnique({
      where: { email: input.email },
    });
    if (!user) {
      throw new NotFoundException('用户不存在');
    }

    try {
      const member = await this.prisma.$transaction(async (transaction) => {
        // 项目成员必须同时成为租户成员，后续租户上下文才能稳定约束其访问范围。
        await transaction.tenantMember.upsert({
          where: { tenantId_userId: { tenantId, userId: user.id } },
          update: {},
          create: { tenantId, userId: user.id, role: 'member' },
        });
        return transaction.projectMember.create({
          data: { projectId, userId: user.id, role: 'member' },
        });
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
    tenantId: string;
    createdAt: Date;
  }): Project {
    return {
      id: project.id,
      name: project.name,
      ownerId: project.ownerId,
      tenantId: project.tenantId,
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
