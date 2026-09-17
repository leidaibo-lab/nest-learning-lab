import { Controller, Get, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
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

@Controller('notifications')
@UseGuards(JwtAuthGuard)
@ApiTags('通知')
@ApiBearerAuth()
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get()
  @ApiOperation({ summary: '查询当前用户通知' })
  @ApiOkResponse({ description: '返回当前用户可见的通知列表' })
  @ApiUnauthorizedResponse({ description: '未认证' })
  list(@CurrentUser() user: AuthenticatedUser): Promise<Notification[]> {
    // 以令牌中的 userId 作为查询边界，避免把通知筛选权交给客户端。
    return this.notificationsService.listForUser(user.id);
  }
}
