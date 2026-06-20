import { Module } from '@nestjs/common';
import { SalesController } from './sales.controller';
import { SalesService } from './sales.service';
import { AdvancedSalesService } from './advanced-sales.service';

@Module({
  controllers: [SalesController],
  providers: [SalesService, AdvancedSalesService],
  exports: [SalesService, AdvancedSalesService],
})
export class SalesModule {}
