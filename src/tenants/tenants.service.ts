import { Injectable } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { Tenant, TenantMembership, TenantRole } from './tenant';
import { CreateTenantDto } from './tenant.dto';

@Injectable()
export class TenantsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(input: CreateTenantDto, ownerId: string): Promise<Tenant> {
    const tenant = await this.prisma.$transaction(async (transaction) => {
      const created = await transaction.tenant.create({
        data: { name: input.name },
      });
      await transaction.tenantMember.create({
        data: { tenantId: created.id, userId: ownerId, role: 'owner' },
      });
      return created;
    });

    return this.toTenant(tenant);
  }

  async listForUser(userId: string): Promise<TenantMembership[]> {
    const memberships = await this.prisma.tenantMember.findMany({
      where: { userId },
      include: { tenant: true },
      orderBy: { createdAt: 'asc' },
    });

    return memberships.map((membership) => ({
      ...this.toTenant(membership.tenant),
      role: this.toRole(membership.role),
    }));
  }

  private toTenant(tenant: {
    id: string;
    name: string;
    createdAt: Date;
  }): Tenant {
    return {
      id: tenant.id,
      name: tenant.name,
      createdAt: tenant.createdAt.toISOString(),
    };
  }

  private toRole(role: string): TenantRole {
    if (!['owner', 'member'].includes(role)) {
      throw new Error(`不支持的租户角色: ${role}`);
    }
    return role as TenantRole;
  }
}
