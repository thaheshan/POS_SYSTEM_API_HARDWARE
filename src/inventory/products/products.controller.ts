import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Patch,
  Req,
  UseGuards,
  UseInterceptors,
  UploadedFile,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
  ApiConsumes,
} from '@nestjs/swagger';
import { ProductsService } from './products.service';
import { CreateProductDto } from './dto/create-product.dto';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { RolesGuard } from 'src/auth/guards/roles.guard';
import { Roles } from 'src/auth/decorators/roles.decorator';
import { Request } from 'express';
import type { JwtPayload } from 'src/auth/interfaces/jwt-payload.interface';
import { UpdateProductDiscountConfigDto } from './dto/update-product-discount-config.dto';
import { ApproveProductDiscountDto } from './dto/approve-product-discount.dto';

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
  @UseInterceptors(FileInterceptor('imageFile'))
  @ApiConsumes('multipart/form-data', 'application/json')
  @ApiOperation({ summary: 'Create a new product' })
  @ApiResponse({ status: 201, description: 'Product created successfully' })
  async createProduct(
    @Body() dto: CreateProductDto,
    @Req() req: AuthenticatedRequest,
    @UploadedFile() imageFile?: any,
  ) {
    // When using FormData, numbers might be strings, but ValidationPipe should handle conversion if transform: true.
    return this.productsService.createProduct(
      dto,
      req.user.tenant_id,
      req.user.sub,
      imageFile,
    );
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
  async createCategory(
    @Body() body: { name: string; description?: string },
    @Req() req: AuthenticatedRequest,
  ) {
    return this.productsService.createCategory(
      req.user.tenant_id,
      body.name,
      body.description,
    );
  }

  @Get('categories/:id/subcategories')
  @ApiOperation({ summary: 'Get subcategories for a parent category' })
  async getSubcategories(
    @Param('id') parentId: string,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.productsService.getSubcategories(req.user.tenant_id, parentId);
  }

  @Post('categories/:id/subcategories')
  @ApiOperation({ summary: 'Create a subcategory under a parent category' })
  async createSubcategory(
    @Param('id') parentId: string,
    @Body() body: { name: string; description?: string },
    @Req() req: AuthenticatedRequest,
  ) {
    return this.productsService.createSubcategory(
      req.user.tenant_id,
      parentId,
      body.name,
      body.description,
    );
  }

  @Patch('categories/:id')
  @ApiOperation({ summary: 'Update a category or subcategory name/description' })
  async updateCategory(
    @Param('id') categoryId: string,
    @Body() body: { name?: string; description?: string },
    @Req() req: AuthenticatedRequest,
  ) {
    return this.productsService.updateCategory(
      req.user.tenant_id,
      categoryId,
      body.name,
      body.description,
    );
  }

  @Delete('categories/:id')
  @ApiOperation({ summary: 'Delete (deactivate) a category' })
  async deleteCategory(
    @Param('id') categoryId: string,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.productsService.deleteCategory(req.user.tenant_id, categoryId);
  }

  @Get()
  @ApiOperation({ summary: 'Get all products' })
  @ApiResponse({ status: 200, description: 'List of products' })
  async getProducts(@Req() req: AuthenticatedRequest) {
    return this.productsService.getProducts(req.user.tenant_id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update an existing product' })
  @ApiResponse({ status: 200, description: 'Product updated successfully' })
  async updateProduct(
    @Param('id') id: string,
    @Body() dto: any,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.productsService.updateProduct(
      id,
      dto,
      req.user.tenant_id,
      req.user.sub,
    );
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a product by ID' })
  @ApiResponse({ status: 200, description: 'Product deleted successfully' })
  async deleteProduct(
    @Param('id') id: string,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.productsService.deleteProduct(id, req.user.tenant_id);
  }

  @Patch(':id/discount-config')
  async updateDiscountConfig(
    @Param('id') productId: string,
    @Body() dto: UpdateProductDiscountConfigDto,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.productsService.updateDiscountConfig(
      productId,
      dto,
      req.user.tenant_id,
    );
  }

  @Patch(':id/discount-approval')
  @UseGuards(RolesGuard)
  @Roles('OWNER')
  async approveDiscount(
    @Param('id') productId: string,
    @Body() dto: ApproveProductDiscountDto,
    @Req() req: AuthenticatedRequest,
  ) {
    const tenantId = req.user.tenant_id;
    return this.productsService.approveDiscount(productId, dto, tenantId);
  }
}
