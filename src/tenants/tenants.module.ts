import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { TenantContextGuard } from './tenant-context.guard';
import { TenantsController } from './tenants.controller';
import { TenantsService } from './tenants.service';

@Module({
  imports: [AuthModule],
  controllers: [TenantsController],
  providers: [TenantContextGuard, TenantsService],
  exports: [TenantContextGuard],
})
export class TenantsModule {}
