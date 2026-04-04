import {
  Controller, Get, Post, Delete, Body, Param, Query, HttpCode, HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { HeldBillsService } from './held-bills.service';
import { CreateHeldBillDto } from './dto/create-held-bill.dto';

@ApiTags('Held Bills')
@Controller('sales/held-bills')
export class HeldBillsController {
  constructor(private readonly heldBillsService: HeldBillsService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Park current cart' })
  async create(@Body() dto: CreateHeldBillDto) {
    return this.heldBillsService.create(dto);
  }

  @Get()
  @ApiOperation({ summary: "Get cashier's held bills" })
  @ApiQuery({ name: 'cashier_id', required: true })
  async findByCashier(@Query('cashier_id') cashier_id: string) {
    return this.heldBillsService.findByCashier(cashier_id);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Discard held bill' })
  async remove(@Param('id') id: string) {
    return this.heldBillsService.remove(id);
  }
}