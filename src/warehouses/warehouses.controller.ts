import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Req } from '@nestjs/common';
import { WarehousesService } from './warehouses.service';
import { CreateWarehouseDto, UpdateWarehouseDto } from './dto/warehouse.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';

interface AuthenticatedRequest {
  user: { tenant_id: string; user_id: string };
}

@ApiTags('Warehouses')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('warehouses')
export class WarehousesController {
  constructor(private readonly warehousesService: WarehousesService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new warehouse' })
  create(@Body() createWarehouseDto: CreateWarehouseDto, @Req() req: AuthenticatedRequest) {
    return this.warehousesService.create(req.user.tenant_id, createWarehouseDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all warehouses for the tenant' })
  findAll(@Req() req: AuthenticatedRequest) {
    return this.warehousesService.findAll(req.user.tenant_id);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a specific warehouse' })
  findOne(@Param('id') id: string, @Req() req: AuthenticatedRequest) {
    return this.warehousesService.findOne(req.user.tenant_id, id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a warehouse' })
  update(
    @Param('id') id: string,
    @Body() updateWarehouseDto: UpdateWarehouseDto,
    @Req() req: AuthenticatedRequest
  ) {
    return this.warehousesService.update(req.user.tenant_id, id, updateWarehouseDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a warehouse (fails if it contains stock)' })
  remove(@Param('id') id: string, @Req() req: AuthenticatedRequest) {
    return this.warehousesService.remove(req.user.tenant_id, id);
  }
}
