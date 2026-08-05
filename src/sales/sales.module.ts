import { Module } from '@nestjs/common';
import { SalesController } from './sales.controller';
import { SalesService } from './sales.service';
import { AdvancedSalesService } from './advanced-sales.service';
import { ActivityLogsModule } from '../activity-logs/activity-logs.module';
import { PublicSalesController } from './public-sales.controller';
import { SmsModule } from '../sms/sms.module';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule, ActivityLogsModule, SmsModule],
  controllers: [SalesController, PublicSalesController],
  providers: [SalesService, AdvancedSalesService],
  exports: [SalesService, AdvancedSalesService],
})
export class SalesModule {}
