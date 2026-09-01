import { Controller, Get, Put, Body, UseGuards, Req, BadRequestException, UsePipes, ValidationPipe } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { ShopsService } from './shops.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UpdateShopProfileDto } from './dto/update-shop-profile.dto';
import type { AuthRequest } from '../common/interfaces/auth-request.interface';

@ApiTags('Shop')
@Controller('shop')
@UseGuards(JwtAuthGuard, RolesGuard)
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

  @Put('profile')
  @Roles('OWNER', 'ADMIN')
  @UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
  @ApiOperation({ summary: 'Update currently logged-in shop profile information' })
  @ApiResponse({ status: 200, description: 'Shop profile updated successfully' })
  @ApiResponse({ status: 400, description: 'Validation failed' })
  @ApiResponse({ status: 401, description: 'Authentication required' })
  @ApiResponse({ status: 409, description: 'Business registration number already exists' })
  @ApiResponse({ status: 500, description: 'Failed to update shop profile' })
  async updateProfile(
    @Req() req: AuthRequest,
    @Body() dto: UpdateShopProfileDto,
  ) {
    const tenantId = req.user?.tenant_id;
    const userId = req.user?.sub;
    if (!tenantId || !userId) {
      throw new BadRequestException('User is not associated with any shop');
    }
    return this.shopsService.updateShopProfile(tenantId, userId, dto);
  }
}

