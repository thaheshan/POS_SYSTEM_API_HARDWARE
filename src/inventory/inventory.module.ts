import { Module } from '@nestjs/common';
import { StockMovementsModule } from './stock-movements/stock-movements.module';

@Module({
  imports: [StockMovementsModule],
})
export class InventoryModule {}
