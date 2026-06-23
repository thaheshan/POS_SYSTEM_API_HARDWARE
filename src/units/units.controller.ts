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
import { UnitsService } from './units.service';
import { CreateUnitDto } from './dto/create-unit.dto';
import { UpdateUnitDto } from './dto/update-unit.dto';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import type { AuthRequest } from 'src/common/interfaces/auth-request.interface';

@UseGuards(JwtAuthGuard)
@Controller('units')
export class UnitsController {
  constructor(private readonly unitsService: UnitsService) {}

  @Post()
  async create(
    @Request() req: AuthRequest,
    @Body() createUnitDto: CreateUnitDto,
  ) {
    const tenant_id = req.user.tenant_id;
    const data = await this.unitsService.create(tenant_id, createUnitDto);
    return { success: true, message: 'Unit created', data };
  }

  @Get()
  async findAll(@Request() req: AuthRequest) {
    const tenant_id = req.user.tenant_id;
    const data = await this.unitsService.findAll(tenant_id);
    return { success: true, data };
  }

  @Get(':id')
  async findOne(@Param('id') id: string, @Request() req: AuthRequest) {
    const tenant_id = req.user.tenant_id;
    const unit = await this.unitsService.findOne(tenant_id, id);
    return {
      success: true,
      data: unit,
    };
  }

  @Patch(':id')
  async update(
    @Request() req: AuthRequest,
    @Param('id') id: string,
    @Body() updateUnitDto: UpdateUnitDto,
  ) {
    const tenant_id = req.user.tenant_id;
    const data = await this.unitsService.update(tenant_id, id, updateUnitDto);
    return { success: true, message: 'Unit updated', data };
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Request() req: AuthRequest, @Param('id') id: string) {
    const tenant_id = req.user.tenant_id;
    await this.unitsService.remove(tenant_id, id);
    return { success: true, message: 'Unit removed' };
  }
}
