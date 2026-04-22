import {
  Controller,
  Get,
  Query,
  UseGuards,
  SetMetadata,
  Req,
  Logger,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RoleAccessGuard } from './guards/role-access.guard';
import { DashboardService } from './services/dashboard.service';
import { UserRole } from '@prisma/client';
import { OwnerDashboardResponseDto } from './dtos/owner-dashboard.dto';
import { ManagerDashboardResponseDto } from './dtos/manager-dashboard.dto';
import { CashierDashboardResponseDto } from './dtos/cashier-dashboard.dto';

@Controller('dashboard')
@UseGuards(JwtAuthGuard)
export class DashboardController {
  private readonly logger = new Logger(DashboardController.name);

  constructor(private readonly dashboardService: DashboardService) {}

  @Get('owner')
  @UseGuards(RoleAccessGuard)
  @SetMetadata('roles', [UserRole.owner])
  async getOwnerDashboard(@Req() req: any): Promise<OwnerDashboardResponseDto> {
    const tenantId = req.headers['x-tenant-id'];
    if (!tenantId) {
      throw new Error('x-tenant-id header is required');
    }

    this.logger.debug(`Owner dashboard requested for tenant: ${tenantId}`);
    return this.dashboardService.getOwnerDashboard(tenantId);
  }

  @Get('manager')
  @UseGuards(RoleAccessGuard)
  @SetMetadata('roles', [UserRole.owner, UserRole.manager])
  async getManagerDashboard(
    @Req() req: any,
    @Query('branch_id') branchId: string,
  ): Promise<ManagerDashboardResponseDto> {
    const tenantId = req.headers['x-tenant-id'];
    if (!tenantId) {
      throw new Error('x-tenant-id header is required');
    }
    if (!branchId) {
      throw new Error('branch_id query parameter is required');
    }

    this.logger.debug(`Manager dashboard requested for branch: ${branchId}`);
    return this.dashboardService.getManagerDashboard(tenantId, branchId);
  }

  @Get('cashier')
  @UseGuards(RoleAccessGuard)
  @SetMetadata('roles', [UserRole.cashier])
  async getCashierDashboard(
    @Req() req: any,
  ): Promise<CashierDashboardResponseDto> {
    const tenantId = req.headers['x-tenant-id'];
    const userId = req.user?.user_id;

    if (!tenantId) {
      throw new Error('x-tenant-id header is required');
    }
    if (!userId) {
      throw new Error('User ID not found in JWT token');
    }

    this.logger.debug(`Cashier dashboard requested for user: ${userId}`);
    return this.dashboardService.getCashierDashboard(tenantId, userId);
  }
}
