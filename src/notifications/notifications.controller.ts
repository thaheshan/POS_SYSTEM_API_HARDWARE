import { Controller, Get, Patch, Delete, Query, Req, UseGuards } from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';

@ApiTags('Notifications')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get()
  async getNotifications(
    @Req() req: any,
    @Query('limit') limit?: string,
  ) {
    const data = await this.notificationsService.getNotifications(
      req.user.tenant_id,
      req.user.user_id,
      limit ? parseInt(limit, 10) : 50,
    );
    return { data };
  }

  @Get('unread-count')
  async getUnreadCount(@Req() req: any) {
    const count = await this.notificationsService.getUnreadCount(
      req.user.tenant_id,
      req.user.user_id,
    );
    return { count };
  }

  @Patch('read-all')
  async markAllAsRead(@Req() req: any) {
    await this.notificationsService.markAllAsRead(
      req.user.tenant_id,
      req.user.user_id,
    );
    return { success: true, message: 'All notifications marked as read' };
  }

  @Delete('clear-all')
  async clearAll(@Req() req: any) {
    await this.notificationsService.clearAll(
      req.user.tenant_id,
      req.user.user_id,
    );
    return { success: true, message: 'All notifications cleared' };
  }
}
