import { Module } from '@nestjs/common';
import { AnalyticsController } from './analytics.controller';
import { AnalyticsService } from './analytics.service';
import { ReportExportService } from './report-export.service';
import { WeeklyReportCronService } from './cron/weekly-report.cron';
import { ReportsController } from './reports.controller';
import { PdfService } from './pdf.service';

@Module({
  controllers: [AnalyticsController, ReportsController],
  providers: [
    AnalyticsService,
    ReportExportService,
    WeeklyReportCronService,
    PdfService,
  ],
  exports: [PdfService],
})
export class ReportsModule {}
