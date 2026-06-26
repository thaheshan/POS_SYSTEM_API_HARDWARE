import {
  Controller,
  Get,
  Query,
  Res,
  Req,
  BadRequestException,
  UseGuards,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { PdfService } from './pdf.service';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';

@Controller('reports')
@UseGuards(JwtAuthGuard)
export class ReportsController {
  constructor(private readonly pdfService: PdfService) {}

  private readonly ALLOWED_REPORT_TYPES = [
    'inventory',
    'purchase-order',
    'sales',
    'invoice',
    'customer',
    'staff',
  ];

  @Get('download')
  async downloadReport(
    @Query('type') type: string,
    @Query('id') id: string,
    @Res() res: Response,
    @Req() req: Request,
  ) {
    if (!type || !this.ALLOWED_REPORT_TYPES.includes(type)) {
      throw new BadRequestException(
        `Invalid report type. Allowed types: ${this.ALLOWED_REPORT_TYPES.join(', ')}`,
      );
    }

    const authHeader = req.headers.authorization;
    const token =
      authHeader && authHeader.startsWith('Bearer ')
        ? authHeader.split(' ')[1]
        : undefined;

    const frontendBaseUrl = process.env.FRONTEND_URL || 'http://localhost:3000';

    let targetUrl = `${frontendBaseUrl}/reports/preview/${type}`;
    if (id) {
      targetUrl += `?id=${id}`;
    }

    try {
      const pdfBuffer = await this.pdfService.generatePdfFromUrl(
        targetUrl,
        token,
      );

      const fileName = `${type.toUpperCase()}_Report_${new Date().getTime()}.pdf`;

      res.set({
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${fileName}"`,
        'Content-Length': pdfBuffer.length.toString(),
      });

      res.end(pdfBuffer);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      res.status(500).json({
        statusCode: 500,
        message: 'Failed to generate PDF document.',
        error: errorMessage,
      });
    }
  }
}
