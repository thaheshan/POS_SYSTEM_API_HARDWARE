import { Controller, Get, Query, UseGuards, Req } from '@nestjs/common';
import { StockMovementsService } from './stock-movements.service';
import {
  GetStockMovementsDto,
  StockMovementsPaginatedResponse,
} from './dto/get-stock-movements.dto';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';

@Controller('stock-movements')
@UseGuards(JwtAuthGuard)
export class StockMovementsController {
  constructor(private readonly stockMovementsService: StockMovementsService) {}

  @Get()
  async getMovements(
    @Req() req: any,
    @Query() query: GetStockMovementsDto,
  ): Promise<StockMovementsPaginatedResponse> {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    const tenantId = req.headers['x-tenant-id'] as string;
    return this.stockMovementsService.getMovements(tenantId, query);
  }
}
