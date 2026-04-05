import { Module } from '@nestjs/common';
import { SalesReturnsService } from './sales-returns.service';
import { SalesReturnsController } from './sales-returns.controller';

@Module({
  controllers: [SalesReturnsController],
  providers: [SalesReturnsService],
})
export class SalesReturnsModule {}
