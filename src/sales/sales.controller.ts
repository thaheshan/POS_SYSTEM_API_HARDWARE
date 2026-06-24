import { Body, Controller, Get, Post, Put, Delete, Req, UseGuards, Query, Param } from '@nestjs/common';
import { SalesService } from './sales.service';
import { AdvancedSalesService } from './advanced-sales.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { CreateCheckoutDto } from './dto/create-checkout.dto';
import {
  CreateReturnDto,
  CreateQuotationDto,
  CreateCreditSaleDto,
  CreateBulkSaleDto,
  CreateHoldSaleDto,
  CreateExchangeDto,
  CreateLayawayDto,
} from './dto/advanced-sales.dto';

interface AuthenticatedRequest {
  user: { tenant_id: string; sub: string };
}

@ApiTags('Sales')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('sales')
export class SalesController {
  constructor(
    private readonly salesService: SalesService,
    private readonly advancedSalesService: AdvancedSalesService,
  ) {}

  // ─── Basic CRUD ────────────────────────────────────────────────────────────

  @Get()
  @ApiOperation({ summary: 'Get sales invoices with pagination' })
  async getSales(@Req() req: AuthenticatedRequest, @Query() query: any) {
    return this.salesService.getSales(req.user.tenant_id, query);
  }

  @Get('invoice-lookup/:id')
  @ApiOperation({ summary: 'Look up an invoice by ID or number (for returns/exchanges)' })
  async getInvoiceForReturn(@Req() req: AuthenticatedRequest, @Param('id') id: string) {
    return this.advancedSalesService.getInvoiceForReturn(id, req.user.tenant_id);
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

  // ─── Checkout ──────────────────────────────────────────────────────────────

  @Post('checkout')
  @ApiOperation({ summary: 'Process POS checkout — deducts stock and creates invoice' })
  @ApiResponse({ status: 201, description: 'Invoice created and stock deducted' })
  @ApiResponse({ status: 400, description: 'Insufficient stock or product not found' })
  async checkout(@Body() dto: CreateCheckoutDto, @Req() req: AuthenticatedRequest) {
    return this.salesService.checkout(dto, req.user.tenant_id, req.user.sub);
  }

  // ─── Advanced POS Endpoints ─────────────────────────────────────────────────

  @Post('return')
  @ApiOperation({ summary: 'Process a sales return — restores stock and records refund' })
  @ApiResponse({ status: 201, description: 'Return processed and stock restored' })
  async processReturn(@Body() dto: CreateReturnDto, @Req() req: AuthenticatedRequest) {
    return this.advancedSalesService.processReturn(dto, req.user.tenant_id, req.user.sub);
  }

  @Post('quotation')
  @ApiOperation({ summary: 'Create a price quotation for a customer' })
  async createQuotation(@Body() dto: CreateQuotationDto, @Req() req: AuthenticatedRequest) {
    return this.advancedSalesService.createQuotation(dto, req.user.tenant_id, req.user.sub);
  }

  @Post('credit')
  @ApiOperation({ summary: 'Record a credit sale against a customer account' })
  async processCreditSale(@Body() dto: CreateCreditSaleDto, @Req() req: AuthenticatedRequest) {
    return this.advancedSalesService.processCreditSale(dto, req.user.tenant_id, req.user.sub);
  }

  @Post('bulk')
  @ApiOperation({ summary: 'Record a bulk/wholesale sale with discounts' })
  async processBulkSale(@Body() dto: CreateBulkSaleDto, @Req() req: AuthenticatedRequest) {
    return this.advancedSalesService.processBulkSale(dto, req.user.tenant_id, req.user.sub);
  }

  @Post('hold')
  @ApiOperation({ summary: 'Hold a sale cart to resume later' })
  async holdSale(@Body() dto: CreateHoldSaleDto, @Req() req: AuthenticatedRequest) {
    return this.advancedSalesService.holdSale(dto, req.user.tenant_id, req.user.sub);
  }

  @Get('hold/list')
  @ApiOperation({ summary: 'List all held (suspended) sales for this tenant' })
  async getHeldSales(@Req() req: AuthenticatedRequest) {
    return this.advancedSalesService.getHeldSales(req.user.tenant_id);
  }

  @Post('exchange')
  @ApiOperation({ summary: 'Process an item exchange against an original invoice' })
  async processExchange(@Body() dto: CreateExchangeDto, @Req() req: AuthenticatedRequest) {
    return this.advancedSalesService.processExchange(dto, req.user.tenant_id, req.user.sub);
  }

  @Post('layaway')
  @ApiOperation({ summary: 'Create a layaway/backorder agreement with a deposit' })
  async createLayaway(@Body() dto: CreateLayawayDto, @Req() req: AuthenticatedRequest) {
    return this.advancedSalesService.createLayaway(dto, req.user.tenant_id, req.user.sub);
  }
}

