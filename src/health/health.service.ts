import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { ApplicationLifecycleService } from '../lifecycle/application-lifecycle.service';

export interface HealthReport {
  status: 'ok';
  checks: {
    database: 'up';
  };
}

export interface LivenessReport {
  status: 'ok';
  checks: {
    process: 'up';
  };
}

@Injectable()
export class HealthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly lifecycle: ApplicationLifecycleService,
  ) {}

  liveness(): LivenessReport {
    // 存活探针只回答进程是否还能响应；不访问数据库，避免依赖故障触发无意义重启。
    return { status: 'ok', checks: { process: 'up' } };
  }

  async check(): Promise<HealthReport> {
    return this.checkReadiness();
  }

  async checkReadiness(): Promise<HealthReport> {
    if (this.lifecycle.isDraining()) {
      // 停机排空期间拒绝新流量，但不影响存活探针继续证明进程还能响应。
      throw new ServiceUnavailableException({
        status: 'error',
        checks: { database: 'up' },
        reason: 'draining',
      });
    }

    try {
      // 就绪探针验证实例能否访问关键依赖，失败时应停止接收流量而不是重启整个进程。
      await this.prisma.$queryRaw`SELECT 1`;
      return { status: 'ok', checks: { database: 'up' } };
    } catch {
      throw new ServiceUnavailableException({
        status: 'error',
        checks: { database: 'down' },
      });
    }
  }
}
