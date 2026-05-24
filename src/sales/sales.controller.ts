import { Body, Controller, Get, Post, Req, UseGuards, Query } from '@nestjs/common';
import { SalesService } from './sales.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { CreateCheckoutDto } from './dto/create-checkout.dto';

interface AuthenticatedRequest {
  user: { tenant_id: string; sub: string };
}

@ApiTags('Sales')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('sales')
export class SalesController {
  constructor(private readonly salesService: SalesService) {}

  @Get()
  @ApiOperation({ summary: 'Get sales invoices with pagination' })
  async getSales(@Req() req: AuthenticatedRequest, @Query() query: any) {
    return this.salesService.getSales(req.user.tenant_id, query);
  }

  @Post('checkout')
  @ApiOperation({ summary: 'Process POS checkout — deducts stock and creates invoice' })
  @ApiResponse({ status: 201, description: 'Invoice created and stock deducted' })
  @ApiResponse({ status: 400, description: 'Insufficient stock or product not found' })
  async checkout(@Body() dto: CreateCheckoutDto, @Req() req: AuthenticatedRequest) {
    return this.salesService.checkout(dto, req.user.tenant_id, req.user.sub);
  }
}
