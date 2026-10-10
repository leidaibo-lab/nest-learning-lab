import { Controller, Get } from '@nestjs/common';
import {
  ApiOkResponse,
  ApiOperation,
  ApiServiceUnavailableResponse,
  ApiTags,
} from '@nestjs/swagger';
import { SkipThrottle } from '@nestjs/throttler';
import { HealthService } from './health.service';
import type { HealthReport, LivenessReport } from './health.service';

@Controller('health')
@ApiTags('健康检查')
@SkipThrottle()
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  @Get('live')
  @ApiOperation({ summary: '检查进程是否仍可响应' })
  @ApiOkResponse({ description: '进程可以响应请求' })
  // 存活探针不依赖数据库；容器编排只应在进程失去响应时重启实例。
  liveness(): LivenessReport {
    return this.healthService.liveness();
  }

  @Get('ready')
  @ApiOperation({ summary: '检查实例是否可以接收流量' })
  @ApiOkResponse({ description: '数据库连接正常，可以接收流量' })
  @ApiServiceUnavailableResponse({ description: '数据库不可用，暂不接收流量' })
  // 就绪探针用于摘除故障实例；它与存活探针职责不同，不应把依赖故障变成进程重启。
  readiness(): Promise<HealthReport> {
    return this.healthService.checkReadiness();
  }

  @Get()
  @ApiOperation({ summary: '检查服务和数据库健康状态' })
  @ApiOkResponse({ description: '数据库连接正常' })
  @ApiServiceUnavailableResponse({ description: '数据库不可用' })
  // 供容器、负载均衡器或监控系统调用；数据库异常由全局 Filter 转为 503。
  check(): Promise<HealthReport> {
    return this.healthService.check();
  }
}
