import { Module } from '@nestjs/common';
import { DailyModule } from './daily/daily.module';
import { EndOfDayModule } from './end-of-day/end-of-day.module';

@Module({
  imports: [DailyModule, EndOfDayModule]
})
export class ReportsModule {}
