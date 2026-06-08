import { Module } from '@nestjs/common';
import { StockModule } from './stock/stock.module';
import { ProductsModule } from './products/products.module';
import { SuppliersModule } from './suppliers/suppliers.module';

@Module({
  imports: [StockModule, ProductsModule, SuppliersModule]
})
export class InventoryModule {}
