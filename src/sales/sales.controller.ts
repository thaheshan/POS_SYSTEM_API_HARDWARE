import { Body, Controller, Get, Post, Put, Delete, Req, UseGuards, Query, Param } from '@nestjs/common';
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

  @Get(':id')
  @ApiOperation({ summary: 'Get a specific sales invoice by ID' })
  async getSaleById(@Req() req: AuthenticatedRequest, @Param('id') id: string) {
    return this.salesService.getSaleById(req.user.tenant_id, id);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update a specific sales invoice by ID' })
  async updateSale(@Req() req: AuthenticatedRequest, @Param('id') id: string, @Body() body: any) {
    return this.salesService.updateSale(req.user.tenant_id, id, body);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a specific sales invoice permanently' })
  async deleteSale(@Req() req: AuthenticatedRequest, @Param('id') id: string) {
    return this.salesService.deleteSale(req.user.tenant_id, id);
  }

  @Post('checkout')
  @ApiOperation({ summary: 'Process POS checkout — deducts stock and creates invoice' })
  @ApiResponse({ status: 201, description: 'Invoice created and stock deducted' })
  @ApiResponse({ status: 400, description: 'Insufficient stock or product not found' })
  async checkout(@Body() dto: CreateCheckoutDto, @Req() req: AuthenticatedRequest) {
    return this.salesService.checkout(dto, req.user.tenant_id, req.user.sub);
  }
}
