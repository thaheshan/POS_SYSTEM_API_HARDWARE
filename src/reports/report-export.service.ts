import { Injectable, StreamableFile } from '@nestjs/common';
import { Response } from 'express';
import {
  MonthlyAnalyticsReport,
  WeeklyAnalyticsReport,
} from './interfaces/analytics-report.interface';
import { Parser } from 'json2csv';
import PDFDocument from 'pdfkit';
export type AnalyticsReport = WeeklyAnalyticsReport | MonthlyAnalyticsReport;

@Injectable()
export class ReportExportService {
  public generateCsv<T>(
    data: T[],
    filename: string,
    res: Response,
  ): StreamableFile {
    res.set({
      'Content-Type': 'text/csv',
      'Content-Disposition': `attachment; filename="${filename}.csv"`,
    });

    const parser = new Parser();
    const csvString = parser.parse(data);

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
      .text(`Generated on: ${new Date().toLocaleString()}`, {
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
