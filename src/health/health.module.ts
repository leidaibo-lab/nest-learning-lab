import { Module } from '@nestjs/common';
import { ApplicationLifecycleService } from '../lifecycle/application-lifecycle.service';
import { HealthController } from './health.controller';
import { HealthService } from './health.service';

@Module({
  controllers: [HealthController],
  providers: [ApplicationLifecycleService, HealthService],
  exports: [ApplicationLifecycleService],
})
export class HealthModule {}
