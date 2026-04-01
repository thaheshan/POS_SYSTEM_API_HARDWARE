import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { TransfersService } from './transfers.service';
import { CreateTransferDto } from './dto/create-transfer.dto';
import { UpdateTransferDto } from './dto/update-transfer.dto';
import { ApproveTransferDto } from './dto/approve-transfer.dto';
import { ReceiveTransferDto } from './dto/receive-transfer.dto';

@ApiTags('Stock Transfers')
@Controller('inventory/stock-transfers')
export class TransfersController {
  constructor(private readonly transfersService: TransfersService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create stock transfer request' })
  @ApiResponse({ status: 201, description: 'Transfer created' })
  @ApiResponse({ status: 400, description: 'Same warehouse / validation error' })
  async create(@Body() dto: CreateTransferDto) {
    return this.transfersService.create(dto);
  }

  @Get()
  @ApiOperation({ summary: 'List all transfers' })
  async findAll() {
    return this.transfersService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get transfer details' })
  @ApiResponse({ status: 404, description: 'Transfer not found' })
  async findOne(@Param('id') id: string) {
    return this.transfersService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Edit pending transfer' })
  async update(@Param('id') id: string, @Body() dto: UpdateTransferDto) {
    return this.transfersService.update(id, dto);
  }

  @Post(':id/approve')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Approve transfer → in_transit' })
  async approve(@Param('id') id: string, @Body() dto: ApproveTransferDto) {
    return this.transfersService.approve(id, dto);
  }

  @Post(':id/receive')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Receive transfer → received' })
  async receive(@Param('id') id: string, @Body() dto: ReceiveTransferDto) {
    return this.transfersService.receive(id, dto);
  }

  @Post(':id/cancel')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Cancel transfer' })
  async cancel(@Param('id') id: string) {
    return this.transfersService.cancel(id);
  }
}