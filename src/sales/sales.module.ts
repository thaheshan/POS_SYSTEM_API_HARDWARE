import { Module } from '@nestjs/common';
import { QuotationsModule } from './quotations/quotations.module';

@Module({
  imports: [QuotationsModule]
})
export class SalesModule {}
