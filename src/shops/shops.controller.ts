import { Controller, Get, Post, Patch, Body, UseGuards, UseInterceptors, UploadedFile, Req, BadRequestException } from '@nestjs/common';
import { ShopsService } from './shops.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { FileInterceptor } from '@nestjs/platform-express';
import type { AuthRequest } from '../common/interfaces/auth-request.interface';

@Controller('shops')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ShopsController {
  constructor(private readonly shopsService: ShopsService) {}

  @Get('profile')
  @Roles('OWNER', 'ADMIN', 'MANAGER', 'CASHIER', 'STAFF')
  async getProfile(@Req() req: AuthRequest) {
    return this.shopsService.getProfile(req.user.tenant_id);
  }

  @Patch('profile')
  @Roles('OWNER', 'ADMIN')
  async updateProfile(
    @Req() req: AuthRequest,
    @Body() body: {
      name?: string;
      businessRegistration?: string;
      email?: string;
      phone?: string;
      address?: string;
      city?: string;
      district?: string;
      province?: string;
    },
  ) {
    return this.shopsService.updateProfile(req.user.tenant_id, body);
  }

  @Get('settings')
  @Roles('OWNER', 'ADMIN', 'MANAGER')
  async getSettings(@Req() req: AuthRequest) {
    return this.shopsService.getShopSettings(req.user.tenant_id);
  }

  @Patch('settings')
  @Roles('OWNER', 'ADMIN')
  async updateSettings(
    @Req() req: AuthRequest,
    @Body() body: Record<string, any>,
  ) {
    return this.shopsService.updateShopSettings(req.user.tenant_id, body);
  }

  @Get('subscription-status')
  @Roles('OWNER', 'ADMIN')
  async getSubscriptionStatus(@Req() req: AuthRequest) {
    return this.shopsService.getSubscriptionStatus(req.user.tenant_id);
  }

  @Post('self-report-payment')
  @Roles('OWNER', 'ADMIN')
  async selfReportPayment(@Req() req: AuthRequest) {
    return this.shopsService.selfReportPayment(req.user.tenant_id);
  }

  @Post('logo')
  @Roles('OWNER', 'ADMIN')
  @UseInterceptors(FileInterceptor('file', {
    limits: {
      fileSize: 2 * 1024 * 1024, // 2MB
    },
    fileFilter: (req, file, cb) => {
      if (!file.mimetype.match(/\/(jpg|jpeg|png)$/)) {
        return cb(new BadRequestException('Only JPG, JPEG, and PNG files are allowed'), false);
      }
      cb(null, true);
    },
  }))
  async uploadLogo(
    @Req() req: AuthRequest,
    @UploadedFile() file: any,
  ) {
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }

    if (!req.user.tenant_id) {
      throw new BadRequestException('User does not belong to a shop');
    }

    return this.shopsService.uploadLogo(req.user.tenant_id, file);
  }
}
