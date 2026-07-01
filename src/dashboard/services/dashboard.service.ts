import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { OwnerDashboardService } from './owner-dashboard.service';
import { ManagerDashboardService } from './manager-dashboard.service';
import { CashierDashboardService } from './cashier-dashboard.service';
import { UserRole } from '@prisma/client';
import { OwnerDashboardResponseDto } from '../dtos/owner-dashboard.dto';
import { ManagerDashboardResponseDto } from '../dtos/manager-dashboard.dto';
import { CashierDashboardResponseDto } from '../dtos/cashier-dashboard.dto';

@Injectable()
export class DashboardService {
  private readonly logger = new Logger(DashboardService.name);

  constructor(
    private readonly ownerService: OwnerDashboardService,
    private readonly managerService: ManagerDashboardService,
    private readonly cashierService: CashierDashboardService,
  ) {}

  async getOwnerDashboard(
    tenantId: string,
  ): Promise<OwnerDashboardResponseDto> {
    if (!tenantId) {
      throw new BadRequestException('Tenant ID is required');
    }
    return this.ownerService.getOwnerDashboard(tenantId);
  }

  async getManagerDashboard(
    tenantId: string,
    branchId: string,
  ): Promise<ManagerDashboardResponseDto> {
    if (!tenantId || !branchId) {
      throw new BadRequestException('Tenant ID and Branch ID are required');
    }
    return this.managerService.getManagerDashboard(tenantId, branchId);
  }

  async getCashierDashboard(
    tenantId: string,
    userId: string,
  ): Promise<CashierDashboardResponseDto> {
    if (!tenantId || !userId) {
      throw new BadRequestException('Tenant ID and User ID are required');
    }
    return this.cashierService.getCashierDashboard(tenantId, userId);
  }

  // Cache invalidation methods for event-driven invalidation
  async invalidateOwnerDashboard(tenantId: string): Promise<void> {
    await this.ownerService.invalidateCache(tenantId);
  }

  async invalidateManagerDashboard(
    tenantId: string,
    branchId: string,
  ): Promise<void> {
    await this.managerService.invalidateCache(tenantId, branchId);
  }

  async invalidateCashierDashboard(
    tenantId: string,
    userId: string,
  ): Promise<void> {
    await this.cashierService.invalidateCache(tenantId, userId);
  }

  // Bulk invalidation for specific events
  async invalidateOnInvoiceCreated(
    tenantId: string,
    branchId: string,
    cashierId: string,
  ): Promise<void> {
    await Promise.all([
      this.invalidateOwnerDashboard(tenantId),
      this.invalidateManagerDashboard(tenantId, branchId),
      this.invalidateCashierDashboard(tenantId, cashierId),
    ]);
    this.logger.debug('Invalidated all dashboards after invoice creation');
  }

  async invalidateOnStockUpdate(
    tenantId: string,
    branchId: string,
  ): Promise<void> {
    await Promise.all([
      this.invalidateOwnerDashboard(tenantId),
      this.invalidateManagerDashboard(tenantId, branchId),
    ]);
    this.logger.debug(
      'Invalidated owner and manager dashboards after stock update',
    );
  }

  async invalidateOnPayment(
    tenantId: string,
    branchId: string,
    cashierId: string,
  ): Promise<void> {
    await Promise.all([
      this.invalidateOwnerDashboard(tenantId),
      this.invalidateManagerDashboard(tenantId, branchId),
      this.invalidateCashierDashboard(tenantId, cashierId),
    ]);
    this.logger.debug('Invalidated all dashboards after payment');
  }
}
