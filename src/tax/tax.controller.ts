import { Controller, Get, Put, Body, UseGuards, Req, BadRequestException, UsePipes, ValidationPipe } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { TaxService } from './tax.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UpdateVatRateDto } from './dto/update-vat-rate.dto';
import { UpdateTinNumberDto } from './dto/update-tin-number.dto';
import { UpdateVatNumberDto } from './dto/update-vat-number.dto';
import type { AuthRequest } from '../common/interfaces/auth-request.interface';

@ApiTags('Tax')
@Controller('tax')
@UseGuards(JwtAuthGuard, RolesGuard)
export class TaxController {
  constructor(private readonly taxService: TaxService) {}

  // POS-SET-05: Get Tax Configuration
  @Get('config')
  @ApiOperation({ summary: 'Get current tax configuration for the shop' })
  @ApiResponse({ status: 200, description: 'Tax configuration retrieved successfully' })
  @ApiResponse({ status: 401, description: 'Authentication required' })
  @ApiResponse({ status: 404, description: 'Tax configuration not found' })
  @ApiResponse({ status: 500, description: 'Failed to retrieve tax configuration' })
  async getTaxConfig(@Req() req: AuthRequest) {
    const tenantId = req.user?.tenant_id;
    if (!tenantId) {
      throw new BadRequestException('User is not associated with any shop');
    }
    return this.taxService.getTaxConfig(tenantId);
  }

  // POS-SET-06: Update VAT Rate
  @Put('vat-rate')
  @Roles('OWNER', 'ADMIN')
  @UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
  @ApiOperation({ summary: 'Update the shop VAT rate (Admin/Owner only)' })
  @ApiResponse({ status: 200, description: 'VAT rate updated successfully' })
  @ApiResponse({ status: 400, description: 'Invalid input' })
  @ApiResponse({ status: 401, description: 'Authentication required' })
  @ApiResponse({ status: 403, description: 'You are not authorized to update VAT settings' })
  @ApiResponse({ status: 500, description: 'Failed to update VAT rate' })
  async updateVatRate(@Req() req: AuthRequest, @Body() dto: UpdateVatRateDto) {
    const tenantId = req.user?.tenant_id;
    if (!tenantId) {
      throw new BadRequestException('User is not associated with any shop');
    }
    return this.taxService.updateVatRate(tenantId, dto.vat_rate);
  }

  // POS-SET-07: Update TIN Number
  @Put('tin')
  @Roles('OWNER', 'ADMIN')
  @UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
  @ApiOperation({ summary: 'Update the shop TIN number (Admin/Owner only)' })
  @ApiResponse({ status: 200, description: 'TIN number updated successfully' })
  @ApiResponse({ status: 400, description: 'Invalid input' })
  @ApiResponse({ status: 401, description: 'Authentication required' })
  @ApiResponse({ status: 403, description: 'You are not authorized to update TIN settings' })
  @ApiResponse({ status: 409, description: 'TIN number already exists' })
  @ApiResponse({ status: 500, description: 'Failed to update TIN number' })
  async updateTinNumber(@Req() req: AuthRequest, @Body() dto: UpdateTinNumberDto) {
    const tenantId = req.user?.tenant_id;
    if (!tenantId) {
      throw new BadRequestException('User is not associated with any shop');
    }
    return this.taxService.updateTinNumber(tenantId, dto.tin_number);
  }

  // POS-SET-08: Update VAT Number
  @Put('vat-number')
  @Roles('OWNER', 'ADMIN')
  @UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
  @ApiOperation({ summary: 'Update the shop VAT number (Admin/Owner only)' })
  @ApiResponse({ status: 200, description: 'VAT number updated successfully' })
  @ApiResponse({ status: 400, description: 'Invalid input' })
  @ApiResponse({ status: 401, description: 'Authentication required' })
  @ApiResponse({ status: 403, description: 'You are not authorized to update VAT settings' })
  @ApiResponse({ status: 409, description: 'VAT number already exists' })
  @ApiResponse({ status: 500, description: 'Failed to update VAT number' })
  async updateVatNumber(@Req() req: AuthRequest, @Body() dto: UpdateVatNumberDto) {
    const tenantId = req.user?.tenant_id;
    if (!tenantId) {
      throw new BadRequestException('User is not associated with any shop');
    }
    return this.taxService.updateVatNumber(tenantId, dto.vat_number);
  }
}
