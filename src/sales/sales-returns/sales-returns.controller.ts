import {
  Controller,
  Post,
  Body,
  Patch,
  Param,
  UseGuards,
  Request,
  ParseUUIDPipe,
  Get,
  Query,
} from '@nestjs/common';
import { SalesReturnsService } from './sales-returns.service';
import { CreateSalesReturnDto } from './dto/create-sales-return.dto';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import type { AuthRequest } from 'src/common/interfaces/auth-request.interface';
import { RejectSalesReturnDto } from './dto/reject-sales-return.dto';
import { GetSalesReturnsFilterDto } from './dto/get-sales-returns-filter.dto';

@UseGuards(JwtAuthGuard)
@Controller('sales-returns')
export class SalesReturnsController {
  constructor(private readonly salesReturnsService: SalesReturnsService) {}

  @Post()
  async createReturnRequest(
    @Body() createSalesReturnDto: CreateSalesReturnDto,
    @Request() req: AuthRequest,
  ) {
    const userId = req.user.user_id;
    return this.salesReturnsService.createReturnRequest(
      createSalesReturnDto,
      userId,
    );
  }

  @Patch(':id/approve')
  async approveReturn(
    @Param('id') returnId: string,
    @Request() req: AuthRequest,
  ) {
    const userId = req.user.user_id;
    return this.salesReturnsService.approveReturn(returnId, userId);
  }

  @Patch(':id/reject')
  async rejectReturn(
    @Param('id', ParseUUIDPipe) returnId: string,
    @Request() req: AuthRequest,
    @Body() rejectDto: RejectSalesReturnDto,
  ) {
    const rejectedReturn = await this.salesReturnsService.rejectReturn(
      returnId,
      req.user.user_id,
      rejectDto,
    );
    return {
      message: 'Sales return rejected successfully',
      data: rejectedReturn,
    };
  }

  @Get()
  async getAllReturns(
    @Request() req: AuthRequest,
    @Query() filterDto: GetSalesReturnsFilterDto,
  ) {
    return await this.salesReturnsService.getAllReturns(
      req.user.tenant_id,
      filterDto,
    );
  }

  @Get(':id')
  async getReturnById(
    @Param('id', ParseUUIDPipe) returnId: string,
    @Request() req: AuthRequest,
  ) {
    return await this.salesReturnsService.findOneReturn(
      returnId,
      req.user.tenant_id,
    );
  }
}
