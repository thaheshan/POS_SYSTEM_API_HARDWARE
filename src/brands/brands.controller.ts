import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Headers,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { BrandsService } from './brands.service';
import { CreateBrandDto } from './dto/create-brand.dto';
import { UpdateBrandDto } from './dto/update-brand.dto';

@Controller('brands')
export class BrandsController {
  constructor(private readonly brandsService: BrandsService) {}

  @Post()
  async create(
    @Headers('tenant_id') tenant_id: string,
    @Body() createBrandDto: CreateBrandDto,
  ) {
    const data = await this.brandsService.create(tenant_id, createBrandDto);
    return { success: true, message: 'Brand created', data };
  }

  @Get()
  async findAll(@Headers('tenant_id') tenant_id: string) {
    const data = await this.brandsService.findAll(tenant_id);
    return { success: true, data };
  }

  @Patch(':id')
  async update(
    @Headers('tenant_id') tenant_id: string,
    @Param('id') id: string,
    @Body() updateBrandDto: UpdateBrandDto,
  ) {
    const data = await this.brandsService.update(tenant_id, id, updateBrandDto);
    return { success: true, message: 'Brand updated', data };
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  async remove(
    @Headers('tenant_id') tenant_id: string,
    @Param('id') id: string,
  ) {
    const data = await this.brandsService.remove(tenant_id, id);
    return { success: true, message: 'Brand removed', data };
  }
}
