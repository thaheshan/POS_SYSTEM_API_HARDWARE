import { Controller, Get, Query, Req, UseGuards } from '@nestjs/common';
import { DashboardService } from './dashboard.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';

@ApiTags('Dashboard')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('dashboard')
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get('stats')
  async getStats(@Req() req: any) {
    return this.dashboardService.getStats(req.user.tenant_id);
  }

  @Get('top-products')
  async getTopProducts(@Req() req: any) {
    return this.dashboardService.getTopProducts(req.user.tenant_id);
  }

  @Get('recent-transactions')
  async getRecentTransactions(
    @Req() req: any,
    @Query('limit') limit?: string,
  ) {
    return this.dashboardService.getRecentTransactions(
      req.user.tenant_id,
      limit ? parseInt(limit) : 10,
    );
  }

  @Get('weekly-chart')
  async getWeeklyChart(@Req() req: any) {
    return this.dashboardService.getWeeklyChart(req.user.tenant_id);
  }
}
