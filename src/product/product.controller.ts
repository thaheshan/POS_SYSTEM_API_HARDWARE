import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Headers,
  Query,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { ProductService } from './product.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';

@Controller('products')
export class ProductController {
  constructor(private readonly productService: ProductService) {}

  @Post()
  create(
    @Body() createProductDto: CreateProductDto,
    @Headers('x-tenant-id') tenantId: string,
    @Headers('x-branch-id') branchId?: string,
  ) {
    return this.productService.create(createProductDto, tenantId, branchId);
  }

  @Get()
  findAll(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('category') category?: string,
    @Query('brand') brand?: string,
    @Query('tax_category') taxCategory?: string,
    @Query('low_stock') lowStock?: string,
    @Query('search') search?: string,
    @Headers('x-tenant-id') tenantId?: string,
  ) {
    return this.productService.findAll({
      page,
      limit,
      category,
      brand,
      taxCategory,
      lowStock,
      search,
      tenantId,
    });
  }

  @Get('barcode/:bc')
  @Throttle({ default: { limit: 120, ttl: 60 } })
  findByBarcode(
    @Param('bc') barcode: string,
    @Headers('x-tenant-id') tenantId: string,
  ) {
    return this.productService.findByBarcode(tenantId, barcode);
  }

  @Get('sku/:sku')
  findBySku(
    @Param('sku') sku: string,
    @Headers('x-tenant-id') tenantId: string,
  ) {
    return this.productService.findBySku(tenantId, sku);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @Headers('x-tenant-id') tenantId: string) {
    return this.productService.findOne(id, tenantId);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updateProductDto: UpdateProductDto,
    @Headers('x-tenant-id') tenantId: string,
  ) {
    return this.productService.update(id, updateProductDto, tenantId);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @Headers('x-tenant-id') tenantId: string) {
    return this.productService.remove(id, tenantId);
  }
}
