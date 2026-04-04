import { Module } from '@nestjs/common';
import { HeldBillsController } from './held-bills.controller';
import { HeldBillsService } from './held-bills.service';

@Module({
  controllers: [HeldBillsController],
  providers: [HeldBillsService],
  exports: [HeldBillsService],
})
export class HeldBillsModule {}