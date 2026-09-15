import { Controller, Get } from '@nestjs/common';
import { HealthReport, HealthService } from './health.service';

@Controller('health')
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  @Get()
  // 供容器、负载均衡器或监控系统调用；数据库异常由全局 Filter 转为 503。
  check(): Promise<HealthReport> {
    return this.healthService.check();
  }
}
