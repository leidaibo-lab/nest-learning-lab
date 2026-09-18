import {
  BadRequestException,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { TenantContextGuard } from './tenant-context.guard';

describe('TenantContextGuard', () => {
  const user = { id: 'user-1', email: 'user@example.com' };

  function createContext(headers: Record<string, string> = {}) {
    const request = { headers, user } as unknown as {
      headers: Record<string, string>;
      user: typeof user;
      tenantId?: string;
    };
    const context = {
      switchToHttp: () => ({ getRequest: () => request }),
    } as unknown as ExecutionContext;
    return { context, request };
  }

  it('uses the only membership when the header is omitted', async () => {
    const prisma = {
      tenantMember: {
        findMany: jest.fn().mockResolvedValue([{ tenantId: 'tenant-1' }]),
        findUnique: jest.fn(),
      },
    } as unknown as PrismaService;
    const guard = new TenantContextGuard(prisma);
    const { context, request } = createContext();

    await expect(guard.canActivate(context)).resolves.toBe(true);
    expect(request.tenantId).toBe('tenant-1');
  });

  it('requires an explicit tenant for multi-tenant users', async () => {
    const prisma = {
      tenantMember: {
        findMany: jest
          .fn()
          .mockResolvedValue([
            { tenantId: 'tenant-1' },
            { tenantId: 'tenant-2' },
          ]),
        findUnique: jest.fn(),
      },
    } as unknown as PrismaService;
    const guard = new TenantContextGuard(prisma);

    await expect(guard.canActivate(createContext().context)).rejects.toThrow(
      BadRequestException,
    );
  });

  it('checks membership for an explicit tenant header', async () => {
    const findUnique = jest.fn().mockResolvedValue({ tenantId: 'tenant-2' });
    const prisma = {
      tenantMember: { findMany: jest.fn(), findUnique },
    } as unknown as PrismaService;
    const guard = new TenantContextGuard(prisma);
    const { context, request } = createContext({
      'x-tenant-id': '123e4567-e89b-42d3-a456-426614174000',
    });

    await expect(guard.canActivate(context)).resolves.toBe(true);
    expect(request.tenantId).toBe('123e4567-e89b-42d3-a456-426614174000');
    expect(findUnique).toHaveBeenCalledWith({
      where: {
        tenantId_userId: {
          tenantId: '123e4567-e89b-42d3-a456-426614174000',
          userId: 'user-1',
        },
      },
    });
  });

  it('rejects a tenant the user does not belong to', async () => {
    const prisma = {
      tenantMember: {
        findMany: jest.fn(),
        findUnique: jest.fn().mockResolvedValue(null),
      },
    } as unknown as PrismaService;
    const guard = new TenantContextGuard(prisma);

    await expect(
      guard.canActivate(
        createContext({
          'x-tenant-id': '123e4567-e89b-42d3-a456-426614174000',
        }).context,
      ),
    ).rejects.toThrow(ForbiddenException);
  });
});
