import { Module } from '@nestjs/common';
import { SalesController } from './sales.controller';
import { SalesService } from './sales.service';
import { AdvancedSalesService } from './advanced-sales.service';
import { ActivityLogsModule } from '../activity-logs/activity-logs.module';

@Module({
  imports: [ActivityLogsModule],
  controllers: [SalesController],
  providers: [SalesService, AdvancedSalesService],
  exports: [SalesService, AdvancedSalesService],
})
export class SalesModule {}
