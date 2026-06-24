import { Module } from '@nestjs/common';
import { QuotationsModule } from './quotations/quotations.module';
import { SalesController } from './sales.controller';
import { SalesService } from './sales.service';
import { AdvancedSalesService } from './advanced-sales.service';


  


@Module({
  imports: [QuotationsModule],
  controllers: [SalesController],
  providers: [SalesService, AdvancedSalesService],
  exports: [SalesService, AdvancedSalesService],
})
export class SalesModule {}
