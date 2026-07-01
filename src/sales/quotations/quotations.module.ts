import { Module } from '@nestjs/common';
import { QuotationsService } from './quotations.service';
import { QuotationsController } from './quotations.controller';
import { PrismaModule } from '../../prisma/prisma.module';
import { RedisModule } from '../../cache/redis.module';

@Module({
  imports: [PrismaModule, RedisModule],
  controllers: [QuotationsController],
  providers: [QuotationsService],
})
export class QuotationsModule {}
