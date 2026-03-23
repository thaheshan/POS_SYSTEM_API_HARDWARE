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
import { UnitsService } from './units.service';
import { CreateUnitDto } from './dto/create-unit.dto';
import { UpdateUnitDto } from './dto/update-unit.dto';

@Controller('units')
export class UnitsController {
  constructor(private readonly unitsService: UnitsService) {}

  @Post()
  async create(
    @Headers('tenant_id') tenant_id: string,
    @Body() createUnitDto: CreateUnitDto,
  ) {
    const data = await this.unitsService.create(tenant_id, createUnitDto);
    return { success: true, message: 'Unit created', data };
  }

  @Get()
  async findAll(@Headers('tenant_id') tenant_id: string) {
    const data = await this.unitsService.findAll(tenant_id);
    return { success: true, data };
  }

  @Patch(':id')
  async update(
    @Headers('tenant_id') tenant_id: string,
    @Param('id') id: string,
    @Body() updateUnitDto: UpdateUnitDto,
  ) {
    const data = await this.unitsService.update(tenant_id, id, updateUnitDto);
    return { success: true, message: 'Unit updated', data };
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(
    @Headers('tenant_id') tenant_id: string,
    @Param('id') id: string,
  ) {
    await this.unitsService.remove(tenant_id, id);
    return { success: true, message: 'Unit removed' };
  }
}
