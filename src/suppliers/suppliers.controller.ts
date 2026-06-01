import { Controller, Get, Req, UseGuards, Query, Post, Put, Delete, Body, Param } from '@nestjs/common';
import { SuppliersService } from './suppliers.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiResponse } from '@nestjs/swagger';

@ApiTags('Suppliers')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('suppliers')
export class SuppliersController {
  constructor(private readonly suppliersService: SuppliersService) {}

  @Get()
  @ApiOperation({ summary: 'Get all suppliers' })
  @ApiResponse({ status: 200, description: 'List of suppliers' })
  async getSuppliers(@Req() req: any, @Query() query: any) {
    return this.suppliersService.getSuppliers(req.user.tenant_id, query);
  }

  @Get('stats')
  @ApiOperation({ summary: 'Get supplier KPIs' })
  @ApiResponse({ status: 200, description: 'Supplier statistics' })
  async getStats(@Req() req: any) {
    return this.suppliersService.getStats(req.user.tenant_id);
  }

  @Post()
  @ApiOperation({ summary: 'Create a new supplier' })
  @ApiResponse({ status: 201, description: 'Supplier created' })
  async createSupplier(@Req() req: any, @Body() body: any) {
    return this.suppliersService.createSupplier(req.user.tenant_id, body);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update a supplier' })
  @ApiResponse({ status: 200, description: 'Supplier updated' })
  async updateSupplier(@Req() req: any, @Param('id') id: string, @Body() body: any) {
    return this.suppliersService.updateSupplier(req.user.tenant_id, id, body);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a supplier' })
  @ApiResponse({ status: 200, description: 'Supplier deleted' })
  async deleteSupplier(@Req() req: any, @Param('id') id: string) {
    return this.suppliersService.deleteSupplier(req.user.tenant_id, id);
  }

  // --- Supplier Requests ---
  @Get('requests/list')
  @ApiOperation({ summary: 'Get all supplier requests' })
  async getRequests(@Req() req: any) {
    return this.suppliersService.getRequests(req.user.tenant_id);
  }

  @Get('requests/stats')
  @ApiOperation({ summary: 'Get supplier request KPIs' })
  async getRequestStats(@Req() req: any) {
    return this.suppliersService.getRequestStats(req.user.tenant_id);
  }

  @Post('requests')
  @ApiOperation({ summary: 'Create a supplier request' })
  async createRequest(@Req() req: any, @Body() body: any) {
    return this.suppliersService.createRequest(req.user.tenant_id, req.user.user_id, body);
  }

  @Put('requests/:id/status')
  @ApiOperation({ summary: 'Update a supplier request status' })
  async updateRequestStatus(@Req() req: any, @Param('id') id: string, @Body() body: any) {
    return this.suppliersService.updateRequestStatus(req.user.tenant_id, id, body.status);
  }

  @Get('products')
  @ApiOperation({ summary: 'Get all products with stock for supplier requests' })
  async getProductsForRequest(@Req() req: any) {
    return this.suppliersService.getProductsForRequest(req.user.tenant_id);
  }

  @Get('low-stock')
  @ApiOperation({ summary: 'Get low stock alerts' })
  async getLowStockAlerts(@Req() req: any) {
    return this.suppliersService.getLowStockAlerts(req.user.tenant_id);
  }
}
