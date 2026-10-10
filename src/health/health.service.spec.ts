import { ServiceUnavailableException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../database/prisma.service';
import { ApplicationLifecycleService } from '../lifecycle/application-lifecycle.service';
import { HealthService } from './health.service';

describe('HealthService', () => {
  let service: HealthService;
  let prisma: { $queryRaw: jest.Mock };
  let lifecycle: ApplicationLifecycleService;

  beforeEach(async () => {
    prisma = { $queryRaw: jest.fn() };
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        HealthService,
        ApplicationLifecycleService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();
    service = module.get<HealthService>(HealthService);
    lifecycle = module.get<ApplicationLifecycleService>(
      ApplicationLifecycleService,
    );
  });

  it('reports an available database', async () => {
    prisma.$queryRaw.mockResolvedValue([{ '?column?': 1 }]);

    await expect(service.check()).resolves.toEqual({
      status: 'ok',
      checks: { database: 'up' },
    });
  });

  it('reports a live process without querying the database', () => {
    expect(service.liveness()).toEqual({
      status: 'ok',
      checks: { process: 'up' },
    });
    expect(prisma.$queryRaw).not.toHaveBeenCalled();
  });

  it('uses the database check for readiness', async () => {
    prisma.$queryRaw.mockResolvedValue([{ '?column?': 1 }]);

    await expect(service.checkReadiness()).resolves.toEqual({
      status: 'ok',
      checks: { database: 'up' },
    });
  });

  it('rejects readiness after shutdown starts', async () => {
    lifecycle.beforeApplicationShutdown('SIGTERM');

    await expect(service.checkReadiness()).rejects.toMatchObject({
      response: {
        status: 'error',
        checks: { database: 'up' },
        reason: 'draining',
      },
    });
    expect(prisma.$queryRaw).not.toHaveBeenCalled();
  });

  it('maps database failures to service unavailable', async () => {
    prisma.$queryRaw.mockRejectedValue(new Error('connection refused'));

    await expect(service.check()).rejects.toBeInstanceOf(
      ServiceUnavailableException,
    );
    await expect(service.check()).rejects.toMatchObject({
      response: { status: 'error', checks: { database: 'down' } },
    });
  });
});
