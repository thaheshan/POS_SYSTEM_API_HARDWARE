import { Controller, Get, Post, Body, Req, UseGuards, Query, ForbiddenException } from '@nestjs/common';
import { ActivityLogsService } from './activity-logs.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';

@ApiTags('Activity Logs')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('activity-logs')
export class ActivityLogsController {
  constructor(private readonly activityLogsService: ActivityLogsService) {}

  @Get()
  async findAll(
    @Req() req: any,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('searchUser') searchUser?: string,
  ) {
    const role = req.user.role?.toLowerCase();
    if (role !== 'admin' && role !== 'owner') {
      throw new ForbiddenException('Only shop owners and admins can access activity logs.');
    }
    return this.activityLogsService.findAll(req.user.tenant_id, startDate, endDate, searchUser);
  }

  @Post()
  async createLog(@Req() req: any, @Body() body: any) {
    const tenantId = req.user.tenant_id;
    const userId = req.user.sub || req.user.userId || req.user.user_id;
    await this.activityLogsService.log(
      tenantId,
      userId,
      body.action || 'ACTIVITY',
      body.details || '',
      body.amount !== undefined && body.amount !== null ? Number(body.amount) : undefined,
    );
    return { success: true };
  }
}
