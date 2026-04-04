import { Module } from '@nestjs/common';
import { InvoicesModule } from './invoices/invoices.module';
import { HeldBillsModule } from './held-bills/held-bills.module';

@Module({
  imports: [InvoicesModule, HeldBillsModule],
})
export class SalesModule {}