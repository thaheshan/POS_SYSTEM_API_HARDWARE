import { Module } from '@nestjs/common';
import { StockModule } from './stock/stock.module';
import { ProductsModule } from './products/products.module';

@Module({
  imports: [StockModule, ProductsModule]
})
export class InventoryModule {}
