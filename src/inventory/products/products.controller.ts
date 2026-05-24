import { Body, Controller, Get, Post, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { ProductsService } from './products.service';
import { CreateProductDto } from './dto/create-product.dto';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { Request } from 'express';
import type { JwtPayload } from 'src/auth/interfaces/jwt-payload.interface';

interface AuthenticatedRequest extends Request {
  user: JwtPayload;
}

@ApiTags('Products')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('products')
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new product' })
  @ApiResponse({ status: 201, description: 'Product created successfully' })
  async createProduct(@Body() dto: CreateProductDto, @Req() req: AuthenticatedRequest) {
    return this.productsService.createProduct(dto, req.user.tenant_id, req.user.sub);
  }

  @Get('categories')
  @ApiOperation({ summary: 'Get all categories' })
  @ApiResponse({ status: 200, description: 'List of categories' })
  async getCategories(@Req() req: AuthenticatedRequest) {
    return this.productsService.getCategories(req.user.tenant_id);
  }

  @Post('categories')
  @ApiOperation({ summary: 'Create a new category' })
  @ApiResponse({ status: 201, description: 'Category created' })
  async createCategory(@Body() body: { name: string; description?: string }, @Req() req: AuthenticatedRequest) {
    return this.productsService.createCategory(req.user.tenant_id, body.name, body.description);
  }

  @Get()
  @ApiOperation({ summary: 'Get all products' })
  @ApiResponse({ status: 200, description: 'List of products' })
  async getProducts(@Req() req: AuthenticatedRequest) {
    return this.productsService.getProducts(req.user.tenant_id);
  }
}
