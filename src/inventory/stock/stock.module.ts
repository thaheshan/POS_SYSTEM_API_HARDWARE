import { Module } from '@nestjs/common';
import { StockController } from './stock.controller';
import { StockService } from './stock.service';
import { StockCronService } from './stock-cron.service';

@Module({
  controllers: [StockController],
  providers: [StockService, StockCronService],
})
export class StockModule {}
