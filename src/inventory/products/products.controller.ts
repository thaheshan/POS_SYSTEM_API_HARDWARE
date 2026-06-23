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
    @Body()
    body: {
      name: string;
      categoryCode?: string;
      description?: string;
    },
    @Req() req: AuthenticatedRequest,
  ) {
    return this.productsService.createCategory(
      req.user.tenant_id,
      body.name,
      body.categoryCode,
      body.description,
    );
  }

  @Patch('categories/:id')
  @ApiOperation({ summary: 'Update an existing category' })
  @ApiResponse({ status: 200, description: 'Category updated successfully' })
  async updateCategory(
    @Param('id') id: string,
    @Body()
    body: { name?: string; categoryCode?: string; description?: string },
    @Req() req: AuthenticatedRequest,
  ) {
    // Note: Ensure your ProductsService has this method implemented!
    return this.productsService.updateCategory(req.user.tenant_id, id, body);
  }

  @Delete('categories/:id')
  @ApiOperation({ summary: 'Delete a category by ID' })
  @ApiResponse({ status: 200, description: 'Category deleted successfully' })
  async deleteCategory(
    @Param('id') id: string,
    @Req() req: AuthenticatedRequest,
  ) {
    // Note: Ensure your ProductsService has this method implemented!
    return this.productsService.deleteCategory(req.user.tenant_id, id);
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
}
