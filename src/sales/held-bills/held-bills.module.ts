import { Module } from '@nestjs/common';
import { HeldBillsController } from './held-bills.controller';
import { HeldBillsService } from './held-bills.service';
import { HeldBillsCron } from './held-bills.cron';

@Module({
  controllers: [HeldBillsController],
  providers: [HeldBillsService, HeldBillsCron],
  exports: [HeldBillsService],
})
export class HeldBillsModule {}