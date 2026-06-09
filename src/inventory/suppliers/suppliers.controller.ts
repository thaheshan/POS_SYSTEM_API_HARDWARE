import { Controller, Get, Param, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { SuppliersService } from './suppliers.service';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { Request } from 'express';
import type { JwtPayload } from 'src/auth/interfaces/jwt-payload.interface';

interface AuthenticatedRequest extends Request {
  user: JwtPayload;
}

@ApiTags('Suppliers')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('suppliers')
export class SuppliersController {
  constructor(private readonly suppliersService: SuppliersService) {}

  @Get()
  @ApiOperation({ summary: 'Get all suppliers' })
  @ApiResponse({ status: 200, description: 'List of suppliers' })
  async getSuppliers(@Req() req: AuthenticatedRequest) {
    return this.suppliersService.getSuppliers(req.user.tenant_id);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a single supplier' })
  @ApiResponse({ status: 200, description: 'Supplier details' })
  async getSupplierById(@Param('id') id: string, @Req() req: AuthenticatedRequest) {
    return this.suppliersService.getSupplierById(id, req.user.tenant_id);
  }
}
