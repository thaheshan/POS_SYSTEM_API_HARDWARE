import {
  Body,
  Controller,
  Delete,
  Get,
  Headers,
  Param,
  Patch,
  Post,
  Request,
  UseGuards,
} from '@nestjs/common';
import { CreateCategoryDto } from './dto/create-category.dto';
import { CategoriesService } from './categories.service';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import type { AuthRequest } from 'src/common/interfaces/auth-request.interface';

@UseGuards(JwtAuthGuard)
@Controller('categories')
export class CategoriesController {
  constructor(private readonly categoriesService: CategoriesService) {}
  @Post()
  async createCategory(
    @Request() req: AuthRequest,
    @Body() createCategoryDto: CreateCategoryDto,
  ) {
    const tenant_id = req.user.tenant_id;
    const category = await this.categoriesService.createCategory(
      tenant_id,
      createCategoryDto,
    );

    return {
      success: true,
      message: 'Category created successfully',
      data: category,
    };
  }

  @Get('tree')
  async getCategoryTree(@Request() req: AuthRequest) {
    const tenant_id = req.user.tenant_id;
    const tree = await this.categoriesService.getCategoryTree(tenant_id);
    return {
      success: true,
      message: 'Category tree retrieved successfully',
      data: tree,
    };
  }

  @Patch(':id')
  async updateCategory(
    @Param('id') id: string,
    @Request() req: AuthRequest,
    @Body() updateCategoryDto: UpdateCategoryDto,
  ) {
    const tenant_id = req.user.tenant_id;
    const category = await this.categoriesService.updateCategory(
      tenant_id,
      id,
      updateCategoryDto,
    );
    return {
      success: true,
      message: 'Category updated successfully',
      data: category,
    };
  }

  @Delete(':id')
  async deleteCategory(@Request() req: AuthRequest, @Param('id') id: string) {
    const tenant_id = req.user.tenant_id;
    await this.categoriesService.deleteCategory(tenant_id, id);
    return {
      success: true,
      message: 'Category deleted successfully',
    };
  }

  @Post('seed')
  async seedCategories(@Request() req: AuthRequest) {
    const tenant_id = req.user.tenant_id;
    return await this.categoriesService.seedDefaultCategories(tenant_id);
  }
}
