import { Controller, Get, Post, Param, UseGuards } from '@nestjs/common';
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
  getPendingShops() {
    return this.adminService.getPendingShops();
  }

  @Post('approve-shop/:id')
  approveShop(@Param('id') userId: string) {
    return this.adminService.approveShop(userId);
  }

  @Post('reject-shop/:id')
  rejectShop(@Param('id') userId: string) {
    return this.adminService.rejectShop(userId);
  }
}
