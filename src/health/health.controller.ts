import { Controller, Get } from '@nestjs/common';
import {
  ApiOkResponse,
  ApiOperation,
  ApiServiceUnavailableResponse,
  ApiTags,
} from '@nestjs/swagger';
import { SkipThrottle } from '@nestjs/throttler';
import { HealthReport, HealthService } from './health.service';

@Controller('health')
@ApiTags('健康检查')
@SkipThrottle()
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  @Get()
  @ApiOperation({ summary: '检查服务和数据库健康状态' })
  @ApiOkResponse({ description: '数据库连接正常' })
  @ApiServiceUnavailableResponse({ description: '数据库不可用' })
  // 供容器、负载均衡器或监控系统调用；数据库异常由全局 Filter 转为 503。
  check(): Promise<HealthReport> {
    return this.healthService.check();
  }
}
