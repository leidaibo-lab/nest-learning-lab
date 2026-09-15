import type { FastifyRequest } from 'fastify';

export type RequestWithId = FastifyRequest & {
  requestId?: string;
};
