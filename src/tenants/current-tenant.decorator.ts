import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { FastifyRequest } from 'fastify';

type TenantRequest = FastifyRequest & { tenantId: string };

export const CurrentTenant = createParamDecorator(
  (_data: unknown, context: ExecutionContext): string => {
    const request = context.switchToHttp().getRequest<TenantRequest>();
    return request.tenantId;
  },
);
