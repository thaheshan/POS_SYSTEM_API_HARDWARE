import { Module } from '@nestjs/common';
import { DailyModule } from './daily/daily.module';
import { EndOfDayModule } from './end-of-day/end-of-day.module';
import { AnalyticsController } from './analytics.controller';
import { AnalyticsService } from './analytics.service';
import { ReportExportService } from './report-export.service';
import { WeeklyReportCronService } from './cron/weekly-report.cron';

@Module({
  imports: [DailyModule, EndOfDayModule],
  controllers: [AnalyticsController],
  providers: [AnalyticsService, ReportExportService, WeeklyReportCronService],
})
export class ReportsModule {}
