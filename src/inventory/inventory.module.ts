import { Module } from '@nestjs/common';
import { StockMovementsModule } from './stock-movements/stock-movements.module';
import { StockModule } from './stock/stock.module';

@Module({
  imports: [StockMovementsModule, StockModule],
})
export class InventoryModule {}
