import { Module } from '@nestjs/common';
import { WarehousesModule } from './warehouses/warehouses.module';
import { TransfersModule } from './transfers/transfers.module';

@Module({
  imports: [WarehousesModule, TransfersModule],
})
export class InventoryModule {}