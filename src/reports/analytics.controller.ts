import {
  Controller,
  Get,
  Query,
  Res,
  Logger,
  UseGuards,
  StreamableFile,
} from '@nestjs/common';
import type { Response } from 'express';
import { AnalyticsService } from './analytics.service';
import { ReportExportService } from './report-export.service';
import { GetWeeklyReportDto, ExportFormat } from './dto/get-weekly-report.dto';
import { GetMonthlyReportDto } from './dto/get-monthly-report.dto';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import {
  MonthlyAnalyticsReport,
  ReorderSuggestion,
  WeeklyAnalyticsReport,
} from './interfaces/analytics-report.interface';
import { CurrentTenant } from './decorators/tenant.decorator';

@Controller('reports')
@UseGuards(JwtAuthGuard)
export class AnalyticsController {
  private readonly logger = new Logger(AnalyticsController.name);

  constructor(
    private readonly analyticsService: AnalyticsService,
    private readonly exportService: ReportExportService,
  ) {}

  @Get('weekly')
  async getWeeklyAnalytics(
    @CurrentTenant() tenantId: string,
    @Res({ passthrough: true }) response: Response,
    @Query() query: GetWeeklyReportDto,
  ): Promise<StreamableFile | WeeklyAnalyticsReport> {
    this.logger.log(
      `HTTP GET /reports/weekly requested for tenant: ${tenantId}`,
    );

    const report = await this.analyticsService.generateWeeklyReport(
      tenantId,
      query,
    );

    if (query.export === ExportFormat.CSV) {
      return this.exportService.generateCsv(
        report.categoryPerformance,
        `weekly_categories_${query.week_start}`,
        response,
      );
    }

    if (query.export === ExportFormat.PDF) {
      return this.exportService.generatePdf(
        `Weekly Performance Report: ${query.week_start}`,
        report,
        `weekly_report_${query.week_start}`,
        response,
      );
    }

    return report;
  }

  @Get('monthly')
  async getMonthlyAnalytics(
    @CurrentTenant() tenantId: string,
    @Res({ passthrough: true }) response: Response,
    @Query() query: GetMonthlyReportDto,
  ): Promise<StreamableFile | MonthlyAnalyticsReport> {
    this.logger.log(
      `HTTP GET /reports/monthly requested for tenant: ${tenantId}`,
    );

    const report = await this.analyticsService.generateMonthlyReport(
      tenantId,
      query,
    );

    if (query.export === ExportFormat.CSV) {
      return this.exportService.generateCsv(
        report.categoryPerformance,
        `monthly_categories_${query.month}`,
        response,
      );
    }

    if (query.export === ExportFormat.PDF) {
      return this.exportService.generatePdf(
        `Monthly Performance Report: ${query.month}`,
        report,
        `monthly_report_${query.month}`,
        response,
      );
    }

    return report;
  }

  @Get('reorder-list')
  async getLiveReorderList(
    @CurrentTenant() tenantId: string,
    @Res({ passthrough: true }) response: Response,
    @Query('export') exportFormat?: string,
  ): Promise<StreamableFile | ReorderSuggestion[]> {
    this.logger.log(
      `HTTP GET /reports/reorder-list requested for tenant: ${tenantId}`,
    );

    const reorderList =
      await this.analyticsService.getLiveReorderList(tenantId);

    if (exportFormat === 'csv') {
      const today = new Date();
      const pad = (n: number) => n.toString().padStart(2, '0');
      const safeDateString = `${today.getUTCFullYear()}-${pad(today.getUTCMonth() + 1)}-${pad(today.getUTCDate())}`;

      return this.exportService.generateCsv(
        reorderList,
        `reorder_list_${safeDateString}`,
        response,
      );
    }

    return reorderList;
  }

  @Get('revenue-trend')
  async getRevenueTrend(
    @CurrentTenant() tenantId: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    this.logger.log(
      `HTTP GET /reports/revenue-trend requested for tenant: ${tenantId}, range: ${startDate} to ${endDate}`,
    );
    return this.analyticsService.getRevenueTrend(tenantId, startDate, endDate);
  }

  @Get('revenue-comparison')
  async getRevenueComparison(
    @CurrentTenant() tenantId: string,
    @Query('period') period?: string,
  ) {
    this.logger.log(
      `HTTP GET /reports/revenue-comparison requested for tenant: ${tenantId}`,
    );
    return this.analyticsService.getRevenueComparison(tenantId, period);
  }
}
