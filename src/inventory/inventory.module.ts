import { Module } from '@nestjs/common';
import { WarehousesModule } from './warehouses/warehouses.module';

@Module({
  imports: [WarehousesModule],
})
export class InventoryModule {}