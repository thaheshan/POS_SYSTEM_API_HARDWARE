import { Module } from '@nestjs/common';
import { AnalyticsController } from './analytics.controller';
import { AnalyticsService } from './analytics.service';
import { ReportExportService } from './report-export.service';
import { WeeklyReportCronService } from './cron/weekly-report.cron';

@Module({
  controllers: [AnalyticsController],
  providers: [AnalyticsService, ReportExportService, WeeklyReportCronService],
})
export class ReportsModule {}
