import {
  Controller,
  Get,
  Param,
  Query,
  UseGuards,
  Headers,
  Res,
  BadRequestException,
} from '@nestjs/common';
import type { Response } from 'express';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { DailyService } from './daily.service';
import { ReportResponseDto } from '../dtos/report-response.dto';
import { ReportPdfGenerator } from '../utils/report-pdf-generator';

@Controller('reports/daily')
@UseGuards(JwtAuthGuard)
export class DailyController {
  constructor(private readonly dailyService: DailyService) {}

  /**
   * GET /reports/daily/:date
   * Retrieve end-of-day report for a specific date
   * Query params: branch_id (required)
   * Returns: ReportResponseDto
   */
  @Get(':date')
  async getReport(
    @Param('date') date: string,
    @Query('branch_id') branchId: string,
    @Headers('x-tenant-id') tenantId: string,
  ): Promise<ReportResponseDto> {
    // Validate date format (YYYY-MM-DD)
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(date)) {
      throw new BadRequestException('Invalid date format. Use YYYY-MM-DD');
    }

    if (!branchId) {
      throw new BadRequestException('branch_id query param is required');
    }

    if (!tenantId) {
      throw new BadRequestException('x-tenant-id header is required');
    }

    return this.dailyService.getReportByDate(tenantId, date, branchId);
  }

  /**
   * GET /reports/daily/:date/pdf
   * Download end-of-day report as PDF
   * Query params: branch_id (required)
   * Returns: PDF buffer
   */
  @Get(':date/pdf')
  async getReportPdf(
    @Param('date') date: string,
    @Query('branch_id') branchId: string,
    @Headers('x-tenant-id') tenantId: string,
    @Res() res: Response,
  ): Promise<void> {
    // Validate date format (YYYY-MM-DD)
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(date)) {
      throw new BadRequestException('Invalid date format. Use YYYY-MM-DD');
    }

    if (!branchId) {
      throw new BadRequestException('branch_id query param is required');
    }

    if (!tenantId) {
      throw new BadRequestException('x-tenant-id header is required');
    }

    // Retrieve the report
    const report = await this.dailyService.getReportByDate(
      tenantId,
      date,
      branchId,
    );

    // Generate and send PDF
    const pdfBuffer = await ReportPdfGenerator.generateReportPdf(report);

    // Set response headers
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="end-of-day-report-${date}-${branchId}.pdf"`,
    );
    res.setHeader('Content-Length', pdfBuffer.length);

    // Send PDF buffer
    res.send(pdfBuffer);
  }
}
