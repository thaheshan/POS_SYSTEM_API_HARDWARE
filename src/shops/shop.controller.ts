import { Controller, Get, UseGuards, Req, BadRequestException } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { ShopsService } from './shops.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import type { AuthRequest } from '../common/interfaces/auth-request.interface';

@ApiTags('Shop')
@Controller('shop')
@UseGuards(JwtAuthGuard)
export class ShopController {
  constructor(private readonly shopsService: ShopsService) {}

  @Get('profile')
  @ApiOperation({ summary: 'Get currently logged-in shop profile information' })
  @ApiResponse({ status: 200, description: 'Shop profile retrieved successfully' })
  @ApiResponse({ status: 401, description: 'Authentication required' })
  @ApiResponse({ status: 404, description: 'Shop profile not found' })
  @ApiResponse({ status: 500, description: 'Failed to retrieve shop profile' })
  async getProfile(@Req() req: AuthRequest) {
    const tenantId = req.user?.tenant_id;
    if (!tenantId) {
      throw new BadRequestException('User is not associated with any shop');
    }
    return this.shopsService.getShopProfile(tenantId);
  }
}
