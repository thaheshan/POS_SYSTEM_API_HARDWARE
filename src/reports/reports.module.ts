import { Module } from '@nestjs/common';
import { AnalyticsController } from './analytics.controller';
import { AnalyticsService } from './analytics.service';
import { ReportExportService } from './report-export.service';

@Module({
  controllers: [AnalyticsController],
  providers: [AnalyticsService, ReportExportService],
})
export class ReportsModule {}
