import { Controller, Get, Post, Param, UseGuards, Body, Request } from '@nestjs/common';
import { AdminService } from './admin.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('SUPER_ADMIN')
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get('pending-shops')
  async getPendingShops() {
    return this.adminService.getPendingShops();
  }

  @Get('notifications')
  async getNotifications() {
    return this.adminService.getAdminNotifications();
  }

  @Post('confirm-payment/:shopId')
  async confirmPayment(@Param('shopId') shopId: string, @Body('adminName') adminName?: string) {
    return this.adminService.confirmSelfReportPayment(shopId, adminName);
  }

  @Post('reject-payment/:shopId')
  async rejectPayment(@Param('shopId') shopId: string, @Body('adminName') adminName?: string) {
    return this.adminService.rejectSelfReportPayment(shopId, adminName);
  }

  @Post('approve-shop/:id')
  approveShop(@Param('id') userId: string) {
    return this.adminService.approveShop(userId);
  }

  @Post('reject-shop/:id')
  rejectShop(@Param('id') userId: string) {
    return this.adminService.rejectShop(userId);
  }

  @Get('active-shops')
  getActiveShops() {
    return this.adminService.getActiveShops();
  }

  @Post('update-shop-status/:id')
  updateShopStatus(
    @Param('id') shopId: string,
    @Body('status') status: 'ACTIVE' | 'INACTIVE' | 'SUSPENDED'
  ) {
    return this.adminService.updateShopStatus(shopId, status);
  }

  @Post('record-payment/:id')
  recordPayment(
    @Param('id') shopId: string,
    @Body('amount') amount: number,
    @Body('method') method: string,
    @Body('notes') notes?: string,
    @Body('recordedBy') recordedBy?: string
  ) {
    return this.adminService.recordPayment(shopId, amount, method, notes, recordedBy);
  }
}

// Separate controller for shop owner self-service actions (JWT only, no role restriction)
@Controller('shop')
@UseGuards(JwtAuthGuard)
export class ShopOwnerController {
  constructor(private readonly adminService: AdminService) {}

  @Post('self-report-payment')
  selfReportPayment(@Request() req: any) {
    const shopId = req.user.tenant_id;
    if (!shopId) throw new Error('No shop associated with this account');
    return this.adminService.selfReportPayment(shopId);
  }

  @Get('subscription-status')
  getSubscriptionStatus(@Request() req: any) {
    const shopId = req.user.tenant_id;
    if (!shopId) throw new Error('No shop associated with this account');
    return this.adminService.getShopSubscriptionStatus(shopId);
  }
}

