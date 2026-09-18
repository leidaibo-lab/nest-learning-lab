import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { CurrentUser } from '../auth/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import type { AuthenticatedUser } from '../auth/auth.types';
import { Tenant, TenantMembership } from './tenant';
import { CreateTenantDto } from './tenant.dto';
import { TenantsService } from './tenants.service';

@Controller('tenants')
@UseGuards(JwtAuthGuard)
@ApiTags('租户')
@ApiBearerAuth()
export class TenantsController {
  constructor(private readonly tenantsService: TenantsService) {}

  @Post()
  @ApiOperation({ summary: '创建租户' })
  @ApiCreatedResponse({ description: '租户创建成功' })
  @ApiUnauthorizedResponse({ description: '未认证' })
  create(
    @Body() input: CreateTenantDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<Tenant> {
    return this.tenantsService.create(input, user.id);
  }

  @Get()
  @ApiOperation({ summary: '查询我的租户' })
  @ApiOkResponse({ description: '返回当前用户所属租户' })
  @ApiUnauthorizedResponse({ description: '未认证' })
  list(@CurrentUser() user: AuthenticatedUser): Promise<TenantMembership[]> {
    return this.tenantsService.listForUser(user.id);
  }
}
