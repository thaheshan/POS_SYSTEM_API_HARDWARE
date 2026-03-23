import { Module } from '@nestjs/common';
import { redisClientProvider } from '../config/redis.config';
import { ProductService } from './product.service';
import { ProductController } from './product.controller';
import { StockModule } from '../stock/stock.module';

@Module({
  imports: [StockModule],
  controllers: [ProductController],
  providers: [ProductService, redisClientProvider],
})
export class ProductModule {}
