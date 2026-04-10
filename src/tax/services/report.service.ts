import { Injectable } from '@nestjs/common';
import PDFDocument from 'pdfkit';
import * as ExcelJS from 'exceljs';

@Injectable()
export class ReportService {

  // ─── PDF GENERATE ──────────────────────────────
  async generatePdf(reportData: any): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({ margin: 50, size: 'A4' });
      const buffers: Buffer[] = [];

      doc.on('data', (chunk) => buffers.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(buffers)));
      doc.on('error', reject);

      this.buildTaxReportPdf(doc, reportData);
      doc.end();
    });
  }

  private buildTaxReportPdf(doc: any, data: any): void {
    const pageWidth = 595.28;
    const margin = 50;

    // ─── TITLE ────────────────────────────────────
    doc.moveTo(margin, 50).lineTo(pageWidth - margin, 50).stroke();
    doc.fontSize(14).font('Helvetica-Bold')
      .text('TAX COMPLIANCE REPORT', margin, 60, { align: 'center' });
    doc.fontSize(9).font('Helvetica')
      .text(`Period: ${data.reportPeriod.from} to ${data.reportPeriod.to}`, margin, 78, { align: 'center' });
    doc.moveTo(margin, 92).lineTo(pageWidth - margin, 92).stroke();

    let y = 107;

    // ─── SALES SUMMARY ────────────────────────────
    doc.fontSize(11).font('Helvetica-Bold').text('1. SALES SUMMARY', margin, y);
    y += 18;

    const salesRows = [
      ['Total Sales Revenue', `LKR ${Number(data.salesSummary.totalSales).toFixed(2)}`],
      ['Total Invoices', `${data.salesSummary.totalInvoices}`],
      ['Total VAT Collected', `LKR ${Number(data.salesSummary.totalVatCollected).toFixed(2)}`],
      ['Total COGS', `LKR ${Number(data.costSummary.totalCogs).toFixed(2)}`],
    ];

    for (const [label, value] of salesRows) {
      doc.fontSize(9).font('Helvetica').text(label, margin + 10, y);
      doc.text(value, margin + 300, y, { width: 150, align: 'right' });
      y += 14;
    }

    y += 10;

    // ─── TAX SUMMARY ──────────────────────────────
    doc.fontSize(11).font('Helvetica-Bold').text('2. INCOME TAX SUMMARY', margin, y);
    y += 18;

    doc.fontSize(9).font('Helvetica')
      .text('Taxable Income:', margin + 10, y)
      .text(`LKR ${Number(data.taxSummary.taxableIncome).toFixed(2)}`, margin + 300, y, { width: 150, align: 'right' });
    y += 14;

    // Bracket breakdown
    doc.fontSize(9).font('Helvetica-Bold').text('Progressive Tax Breakdown:', margin + 10, y);
    y += 14;

    for (const bracket of data.taxSummary.bracketBreakdown) {
      doc.fontSize(9).font('Helvetica')
        .text(`  ${bracket.rate} on LKR ${Number(bracket.taxableAmount).toFixed(2)}`, margin + 20, y)
        .text(`LKR ${Number(bracket.tax).toFixed(2)}`, margin + 300, y, { width: 150, align: 'right' });
      y += 13;
    }

    // Total tax
    doc.rect(margin, y, pageWidth - margin * 2, 16).fill('#333333');
    doc.fillColor('#ffffff').fontSize(10).font('Helvetica-Bold')
      .text('TOTAL INCOME TAX:', margin + 10, y + 3)
      .text(`LKR ${Number(data.taxSummary.incomeTax).toFixed(2)}`, margin + 300, y + 3, { width: 150, align: 'right' });
    doc.fillColor('#000000');
    y += 26;

    // ─── VAT SUMMARY ──────────────────────────────
    doc.fontSize(11).font('Helvetica-Bold').text('3. VAT SUMMARY', margin, y);
    y += 18;

    const vatRows = [
      ['Output VAT (Collected)', `LKR ${Number(data.vatSummary.outputVat).toFixed(2)}`],
      ['Input VAT (Paid)', `LKR ${Number(data.vatSummary.inputVat).toFixed(2)}`],
      ['Net VAT Payable', `LKR ${Number(data.vatSummary.netVatPayable).toFixed(2)}`],
    ];

    for (const [label, value] of vatRows) {
      doc.fontSize(9).font('Helvetica').text(label, margin + 10, y);
      doc.text(value, margin + 300, y, { width: 150, align: 'right' });
      y += 14;
    }

    y += 20;

    // ─── EXPENSES SUMMARY ─────────────────────────
    doc.fontSize(11).font('Helvetica-Bold').text('4. EXPENSES SUMMARY', margin, y);
    y += 18;
    doc.fontSize(9).font('Helvetica')
      .text('Total Expenses:', margin + 10, y)
      .text(`LKR ${Number(data.expensesSummary?.totalExpenses || 0).toFixed(2)}`, margin + 300, y, { width: 150, align: 'right' });
    y += 14;

    y += 10;

    // ─── ADVANCE TAX PAYMENTS ─────────────────────
    doc.fontSize(11).font('Helvetica-Bold').text('5. ADVANCE TAX PAYMENTS', margin, y);
    y += 18;
    doc.fontSize(9).font('Helvetica')
      .text('Total Advance Paid:', margin + 10, y)
      .text(`LKR ${Number(data.advanceTaxPayments?.total || 0).toFixed(2)}`, margin + 300, y, { width: 150, align: 'right' });
    y += 14;
    doc.text('Balance Tax Due:', margin + 10, y);
    doc.text(`LKR ${Number(data.advanceTaxPayments?.balanceDue || 0).toFixed(2)}`, margin + 300, y, { width: 150, align: 'right' });
    y += 20;

    // ─── SUPPORTING DOCUMENTS ─────────────────────
    doc.fontSize(11).font('Helvetica-Bold').text('6. SUPPORTING DOCUMENTS', margin, y);
    y += 18;
    doc.fontSize(9).font('Helvetica')
      .text(`Invoices: ${data.supportingDocuments?.invoices || 0}`, margin + 10, y);
    y += 13;
    doc.text(`GRNs: ${data.supportingDocuments?.grns || 0}`, margin + 10, y);
    y += 13;
    doc.text(`Expense Records: ${data.supportingDocuments?.expenses || 0}`, margin + 10, y);

    y += 20;

    // ─── SIGNATURE BLOCK ──────────────────────────
    doc.moveTo(margin, y).lineTo(pageWidth - margin, y).strokeColor('#cccccc').stroke();
    y += 15;

    doc.fontSize(9).font('Helvetica').fillColor('#000000')
      .text('Prepared by:', margin, y)
      .text('Authorized Signature:', margin + 250, y);
    y += 40;

    doc.moveTo(margin, y).lineTo(margin + 150, y).stroke();
    doc.moveTo(margin + 250, y).lineTo(margin + 400, y).stroke();
    y += 8;

    doc.fontSize(8).font('Helvetica')
      .text('Shop Owner / Accountant', margin, y)
      .text('Date: _______________', margin + 250, y);

    // ─── FOOTER ───────────────────────────────────
    doc.fontSize(7).font('Helvetica').fillColor('#888888')
      .text(`Generated on: ${new Date().toLocaleString()}`, margin, 800, { align: 'center' })
      .text('This report is generated for IRD compliance purposes.', margin, 810, { align: 'center' });
  }

  // ─── EXCEL GENERATE ────────────────────────────
  async generateExcel(reportData: any): Promise<Buffer> {
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Futura Hardware POS';
    workbook.created = new Date();

    // Sheet 1 — Summary
    const sheet = workbook.addWorksheet('Tax Report');

    // Title
    sheet.mergeCells('A1:D1');
    sheet.getCell('A1').value = 'TAX COMPLIANCE REPORT';
    sheet.getCell('A1').font = { bold: true, size: 16 };
    sheet.getCell('A1').alignment = { horizontal: 'center' };

    sheet.mergeCells('A2:D2');
    sheet.getCell('A2').value = `Period: ${reportData.reportPeriod.from} to ${reportData.reportPeriod.to}`;
    sheet.getCell('A2').alignment = { horizontal: 'center' };

    sheet.addRow([]);

    // Sales Summary
    sheet.addRow(['SALES SUMMARY', '', '', '']).font = { bold: true };
    sheet.addRow(['Total Sales Revenue', '', '', `LKR ${Number(reportData.salesSummary.totalSales).toFixed(2)}`]);
    sheet.addRow(['Total Invoices', '', '', reportData.salesSummary.totalInvoices]);
    sheet.addRow(['Total VAT Collected', '', '', `LKR ${Number(reportData.salesSummary.totalVatCollected).toFixed(2)}`]);
    sheet.addRow(['Total COGS', '', '', `LKR ${Number(reportData.costSummary.totalCogs).toFixed(2)}`]);

    sheet.addRow([]);

    // Tax Summary
    sheet.addRow(['INCOME TAX SUMMARY', '', '', '']).font = { bold: true };
    sheet.addRow(['Taxable Income', '', '', `LKR ${Number(reportData.taxSummary.taxableIncome).toFixed(2)}`]);

    for (const bracket of reportData.taxSummary.bracketBreakdown) {
      sheet.addRow([
        `Tax @ ${bracket.rate}`,
        `on LKR ${Number(bracket.taxableAmount).toFixed(2)}`,
        '',
        `LKR ${Number(bracket.tax).toFixed(2)}`,
      ]);
    }

    const totalTaxRow = sheet.addRow(['TOTAL INCOME TAX', '', '', `LKR ${Number(reportData.taxSummary.incomeTax).toFixed(2)}`]);
    totalTaxRow.font = { bold: true };
    totalTaxRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF333333' } };
    totalTaxRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };

    sheet.addRow([]);

    // Expenses Summary
    sheet.addRow(['EXPENSES SUMMARY', '', '', '']).font = { bold: true };
    sheet.addRow(['Total Expenses', '', '', `LKR ${Number(reportData.expensesSummary?.totalExpenses || 0).toFixed(2)}`]);

    sheet.addRow([]);

    // Advance Tax Payments
    sheet.addRow(['ADVANCE TAX PAYMENTS', '', '', '']).font = { bold: true };
    sheet.addRow(['Total Advance Paid', '', '', `LKR ${Number(reportData.advanceTaxPayments?.total || 0).toFixed(2)}`]);
    sheet.addRow(['Balance Tax Due', '', '', `LKR ${Number(reportData.advanceTaxPayments?.balanceDue || 0).toFixed(2)}`]);

    sheet.addRow([]);

    // Supporting Documents
    sheet.addRow(['SUPPORTING DOCUMENTS', '', '', '']).font = { bold: true };
    sheet.addRow(['Invoices', '', '', reportData.supportingDocuments?.invoices || 0]);
    sheet.addRow(['GRNs', '', '', reportData.supportingDocuments?.grns || 0]);
    sheet.addRow(['Expense Records', '', '', reportData.supportingDocuments?.expenses || 0]);

    sheet.addRow([]);

    // VAT Summary
    sheet.addRow(['VAT SUMMARY', '', '', '']).font = { bold: true };
    sheet.addRow(['Output VAT (Collected)', '', '', `LKR ${Number(reportData.vatSummary.outputVat).toFixed(2)}`]);
    sheet.addRow(['Input VAT (Paid)', '', '', `LKR ${Number(reportData.vatSummary.inputVat).toFixed(2)}`]);
    sheet.addRow(['Net VAT Payable', '', '', `LKR ${Number(reportData.vatSummary.netVatPayable).toFixed(2)}`]);

    // Column widths
    sheet.getColumn('A').width = 30;
    sheet.getColumn('B').width = 25;
    sheet.getColumn('C').width = 15;
    sheet.getColumn('D').width = 20;

    const buffer = await workbook.xlsx.writeBuffer();
    return Buffer.from(buffer);
  }
}