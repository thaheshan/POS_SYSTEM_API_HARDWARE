import { Injectable, StreamableFile } from '@nestjs/common';
import { Response } from 'express';
import {
  MonthlyAnalyticsReport,
  WeeklyAnalyticsReport,
} from './interfaces/analytics-report.interface';
import { Parser } from 'json2csv';
import PDFDocument from 'pdfkit';
export type AnalyticsReport = WeeklyAnalyticsReport | MonthlyAnalyticsReport;

const CSV_FORMULA_PREFIXES = ['=', '+', '-', '@'];

@Injectable()
export class ReportExportService {
  private sanitizeCsvValue(value: unknown): unknown {
    if (typeof value !== 'string') return value;

    const trimmed = value.trimStart();
    if (
      trimmed.length > 0 &&
      CSV_FORMULA_PREFIXES.includes(trimmed.charAt(0))
    ) {
      return `'${value}`;
    }

    return value;
  }

  private sanitizeCsvRow<T extends Record<string, unknown>>(row: T): T {
    const sanitizedEntries = Object.entries(row).map(([key, value]) => [
      key,
      this.sanitizeCsvValue(value),
    ]);

    return Object.fromEntries(sanitizedEntries) as T;
  }

  public generateCsv<T>(
    data: T[],
    filename: string,
    res: Response,
  ): StreamableFile {
    res.set({
      'Content-Type': 'text/csv',
      'Content-Disposition': `attachment; filename="${filename}.csv"`,
    });

    if (data.length === 0) {
      return new StreamableFile(Buffer.from(''));
    }

    const sanitizedData = data.map((row) => {
      if (!row || typeof row !== 'object' || Array.isArray(row)) {
        return row;
      }

      return this.sanitizeCsvRow(row as Record<string, unknown>);
    });

    const parser = new Parser();
    const csvString = parser.parse(sanitizedData);

    return new StreamableFile(Buffer.from(csvString));
  }

  public generatePdf(
    reportTitle: string,
    data: AnalyticsReport,
    filename: string,
    res: Response,
  ): StreamableFile {
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${filename}.pdf"`,
    });

    const doc = new PDFDocument({ margin: 50 });

    doc.fontSize(20).text(reportTitle, { align: 'center' });
    doc.moveDown();
    doc
      .fontSize(10)
      .fillColor('gray')
      .text(`Generated on (UTC): ${new Date().toISOString()}`, {
        align: 'center',
      });

    doc.fillColor('black');
    doc.moveDown(2);

    if (data.taxUpdate) {
      doc
        .fontSize(14)
        .fillColor('black')
        .text('Financial Snapshot', { underline: true });
      doc.moveDown(0.5);
      doc
        .fontSize(12)
        .text(`Period Profit: $${data.taxUpdate.periodProfit}`)
        .text(`YTD Income: $${data.taxUpdate.ytdIncome}`)
        .text(`Estimated Tax: $${data.taxUpdate.estimatedTaxLiability}`);
      doc.moveDown(2);
    }

    if (data.reorderSuggestions && data.reorderSuggestions.length > 0) {
      doc.fontSize(14).text('Inventory Alerts', { underline: true });
      doc.moveDown(0.5);
      data.reorderSuggestions.forEach((item) => {
        doc
          .fontSize(10)
          .text(
            `- ${item.productName}: ${item.availableQuantity} left (Min: ${item.minimumStockLevel})`,
          );
      });
    }

    doc.end();
    return new StreamableFile(doc);
  }
}
