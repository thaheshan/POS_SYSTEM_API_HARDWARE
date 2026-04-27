import {
  Body,
  Controller,
  Get,
  Post,
  Query,
  Req,
  UseGuards,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
} from '@nestjs/common';
import { Request } from 'express';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import type { JwtPayload } from 'src/auth/interfaces/jwt-payload.interface';
import { AddStockDto, DeductStockDto } from './dto/stock_manual.dto';
import { StockService } from './stock.service';
import { GetStockFilterDto } from './dto/get-stock-filter.dto';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiResponse,
  ApiParam,
} from '@nestjs/swagger';

// Extend Express Request with authenticated user
interface AuthenticatedRequest extends Request {
  user: JwtPayload;
}

@ApiTags('Stock Management')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('stock')
export class StockController {
  constructor(private readonly stockService: StockService) {}

  @Get()
  @ApiOperation({ summary: 'Get stock overview with filters' })
  @ApiResponse({
    status: 200,
    description: 'Returns filtered stock overview',
  })
  async getStockOverview(
    @Query() filters: GetStockFilterDto,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.stockService.getStockOverview(filters, req.user.tenant_id);
  }

  @Get('product/:id')
  @ApiOperation({
    summary: 'Get stock levels for a specific product across all warehouses',
  })
  @ApiParam({ name: 'id', description: 'The UUID of the product' })
  @ApiResponse({
    status: 200,
    description: 'Returns warehouse-specific stock for the product.',
  })
  async getProductStock(
    @Param('id', ParseUUIDPipe) productId: string,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.stockService.getProductStock(productId, req.user.tenant_id);
  }

  @Get('out-of-stock')
  @ApiOperation({
    summary: 'Get items that are completely out of stock (available <= 0)',
  })
  @ApiResponse({ status: 200, description: 'Returns out of stock items.' })
  async getOutOfStock(@Req() req: AuthenticatedRequest) {
    // Reuses the overview logic with the out_of_stock flag forced to true
    return this.stockService.getStockOverview(
      { out_of_stock: 'true' },
      req.user.tenant_id,
    );
  }

  @Get('low-stock')
  @ApiOperation({
    summary:
      'Get items that are running critically low (<= minimum stock level)',
  })
  @ApiResponse({ status: 200, description: 'Returns low stock items.' })
  async getLowStock(@Req() req: AuthenticatedRequest) {
    // Reuses the overview logic with the low_stock flag forced to true
    return this.stockService.getStockOverview(
      { low_stock: 'true' },
      req.user.tenant_id,
    );
  }

  @Post('add')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Add stock manually' })
  @ApiResponse({
    status: 200,
    description: 'Stock added successfully',
  })
  @ApiResponse({
    status: 404,
    description: 'Stock record not found',
  })
  async addManualStock(
    @Body() addStockDto: AddStockDto,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.stockService.addManualStock(
      addStockDto,
      req.user.sub,
      req.user.tenant_id,
    );
  }

  @Post('deduct')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Deduct stock manually' })
  @ApiResponse({
    status: 200,
    description: 'Stock deducted successfully',
  })
  @ApiResponse({
    status: 400,
    description: 'Insufficient stock available',
  })
  @ApiResponse({
    status: 404,
    description: 'Stock record not found',
  })
  async deductManualStock(
    @Body() deductStockDto: DeductStockDto,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.stockService.deductManualStock(
      deductStockDto,
      req.user.sub,
      req.user.tenant_id,
    );
  }
}
