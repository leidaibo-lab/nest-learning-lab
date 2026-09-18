import { Controller, Get, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiHeader,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { CurrentUser } from '../auth/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import type { AuthenticatedUser } from '../auth/auth.types';
import { Notification } from './notification';
import { NotificationsService } from './notifications.service';
import { CurrentTenant } from '../tenants/current-tenant.decorator';
import { TenantContextGuard } from '../tenants/tenant-context.guard';

@Controller('notifications')
@UseGuards(JwtAuthGuard, TenantContextGuard)
@ApiTags('通知')
@ApiBearerAuth()
@ApiHeader({
  name: 'x-tenant-id',
  required: false,
  description: '当前租户 UUID；多租户用户必须提供，单租户用户可省略',
})
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get()
  @ApiOperation({ summary: '查询当前用户通知' })
  @ApiOkResponse({ description: '返回当前用户可见的通知列表' })
  @ApiUnauthorizedResponse({ description: '未认证' })
  list(
    @CurrentUser() user: AuthenticatedUser,
    @CurrentTenant() tenantId: string,
  ): Promise<Notification[]> {
    // 以令牌中的 userId 作为查询边界，避免把通知筛选权交给客户端。
    return this.notificationsService.listForUser(user.id, tenantId);
  }
}
