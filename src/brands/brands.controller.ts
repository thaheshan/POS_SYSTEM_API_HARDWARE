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
  UseGuards,
  Request,
} from '@nestjs/common';
import { BrandsService } from './brands.service';
import { CreateBrandDto } from './dto/create-brand.dto';
import { UpdateBrandDto } from './dto/update-brand.dto';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import type { AuthRequest } from 'src/common/interfaces/auth-request.interface';

@UseGuards(JwtAuthGuard)
@Controller('brands')
export class BrandsController {
  constructor(private readonly brandsService: BrandsService) {}

  @Post()
  async create(
    @Request() req: AuthRequest,
    @Body() createBrandDto: CreateBrandDto,
  ) {
    const tenant_id = req.user.tenant_id;
    const data = await this.brandsService.create(tenant_id, createBrandDto);
    return { success: true, message: 'Brand created', data };
  }

  @Get()
  async findAll(@Request() req: AuthRequest) {
    const tenant_id = req.user.tenant_id;
    const data = await this.brandsService.findAll(tenant_id);
    return { success: true, data };
  }

  @Get(':id')
  async findOne(@Param('id') id: string, @Request() req: AuthRequest) {
    const tenant_id = req.user.tenant_id;
    const brand = await this.brandsService.findOne(tenant_id, id);
    return {
      success: true,
      data: brand,
    };
  }

  @Patch(':id')
  async update(
    @Request() req: AuthRequest,
    @Param('id') id: string,
    @Body() updateBrandDto: UpdateBrandDto,
  ) {
    const tenant_id = req.user.tenant_id;
    const data = await this.brandsService.update(tenant_id, id, updateBrandDto);
    return { success: true, message: 'Brand updated', data };
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  async remove(@Request() req: AuthRequest, @Param('id') id: string) {
    const tenant_id = req.user.tenant_id;
    const data = await this.brandsService.remove(tenant_id, id);
    return { success: true, message: 'Brand removed', data };
  }
}
