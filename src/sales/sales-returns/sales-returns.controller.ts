import {
  Controller,
  Post,
  Body,
  Patch,
  Param,
  UseGuards,
  Request,
} from '@nestjs/common';
import { SalesReturnsService } from './sales-returns.service';
import { CreateSalesReturnDto } from './dto/create-sales-return.dto';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import type { AuthRequest } from 'src/common/interfaces/auth-request.interface';

@UseGuards(JwtAuthGuard)
@Controller('sales-returns')
export class SalesReturnsController {
  constructor(private readonly salesReturnsService: SalesReturnsService) {}

  @Post()
  async createReturnRequest(
    @Body() createSalesReturnDto: CreateSalesReturnDto,
    @Request() req: AuthRequest,
  ) {
    const userId = req.user.sub;
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
    const userId = req.user.sub;
    return this.salesReturnsService.approveReturn(returnId, userId);
  }
}
