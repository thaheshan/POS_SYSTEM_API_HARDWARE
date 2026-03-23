import {
  Body,
  Controller,
  Delete,
  Get,
  Headers,
  Param,
  Patch,
  Post,
} from '@nestjs/common';
import { CreateCategoryDto } from './dto/create-category.dto';
import { CategoriesService } from './categories.service';
import { UpdateCategoryDto } from './dto/update-category.dto';

@Controller('categories')
export class CategoriesController {
  constructor(private readonly categoriesService: CategoriesService) {}
  @Post()
  async createCategory(
    @Headers('tenant_id') tenant_id: string,
    @Body() createCategoryDto: CreateCategoryDto,
  ) {
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
  async getCategoryTree(@Headers('tenant_id') tenant_id: string) {
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
    @Headers('tenant_id') tenant_id: string,
    @Body() updateCategoryDto: UpdateCategoryDto,
  ) {
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
  async deleteCategory(
    @Headers('tenant_id') tenant_id: string,
    @Param('id') id: string,
  ) {
    await this.categoriesService.deleteCategory(tenant_id, id);
    return {
      success: true,
      message: 'Category deleted successfully',
    };
  }

  @Post('seed')
  async seedCategories(@Headers('tenant_id') tenant_id: string) {
    return await this.categoriesService.seedDefaultCategories(tenant_id);
  }
}
