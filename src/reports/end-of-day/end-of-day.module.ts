import { Module } from '@nestjs/common';
import { EndOfDayService } from './end-of-day.service';
import { EndOfDayController } from './end-of-day.controller';
import { PrismaModule } from '../../prisma/prisma.module';
import { RedisModule } from '../../cache/redis.module';

@Module({
  imports: [PrismaModule, RedisModule],
  controllers: [EndOfDayController],
  providers: [EndOfDayService],
  exports: [EndOfDayService],
})
export class EndOfDayModule {}
