import { Module } from '@nestjs/common';
import { StockMovementsModule } from './stock-movements/stock-movements.module';
import { StockModule } from './stock/stock.module';
import { ProductsModule } from './products/products.module';
import { SuppliersModule } from './suppliers/suppliers.module';

@Module({
  imports: [StockMovementsModule,StockModule, ProductsModule, SuppliersModule]
})
export class InventoryModule {}
