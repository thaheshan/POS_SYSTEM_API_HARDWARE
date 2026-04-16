import { Module } from '@nestjs/common';
import { DailyService } from './daily.service';
import { DailyController } from './daily.controller';
import { PrismaModule } from '../../prisma/prisma.module';
import { RedisModule } from '../../cache/redis.module';

@Module({
  imports: [PrismaModule, RedisModule],
  controllers: [DailyController],
  providers: [DailyService],
  exports: [DailyService],
})
export class DailyModule {}
