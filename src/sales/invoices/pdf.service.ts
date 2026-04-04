import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import PDFDocument from 'pdfkit';

@Injectable()
export class PdfService {
  constructor(private readonly prisma: PrismaService) {}

  async generateInvoicePdf(id: string): Promise<Buffer> {
    // 1. Invoice data fetch
    const invoice = await this.prisma.salesInvoice.findUnique({
      where: { id },
      include: { items: true, payments: true },
    });

    if (!invoice) throw new NotFoundException('Invoice not found');

    // 2. PDF generate
    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({ margin: 50, size: 'A4' });
      const buffers: Buffer[] = [];

      doc.on('data', (chunk) => buffers.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(buffers)));
      doc.on('error', reject);

      this.buildPdf(doc, invoice);
      doc.end();
    });
  }

  private buildPdf(doc: PDFKit.PDFDocument, invoice: any): void {
    const pageWidth = 595.28;
    const margin = 50;
    const contentWidth = pageWidth - margin * 2;

    // ─── INVOICE TITLE ─────────────────────────────────────────────
    doc
      .fontSize(14)
      .font('Helvetica-Bold')
      .fillColor('#000000')
      .text('TAX INVOICE', margin, 118, { align: 'center' });

    // ─── INVOICE META ──────────────────────────────────────────────
    const metaY = 145;
    const colRight = margin + contentWidth / 2;

    // Left column
    doc.fontSize(9).font('Helvetica-Bold').text('Invoice No:', margin, metaY);
    doc.font('Helvetica').text(invoice.invoice_number, margin + 75, metaY);

    doc.font('Helvetica-Bold').text('Date:', margin, metaY + 14);
    doc.font('Helvetica').text(
      new Date(invoice.created_at).toLocaleDateString('en-GB'),
      margin + 75,
      metaY + 14,
    );

    doc.font('Helvetica-Bold').text('Time:', margin, metaY + 28);
    doc.font('Helvetica').text(
      new Date(invoice.created_at).toLocaleTimeString('en-GB'),
      margin + 75,
      metaY + 28,
    );

    // Right column
    doc.font('Helvetica-Bold').text('Cashier:', colRight, metaY);
    doc.font('Helvetica').text(invoice.cashier_id, colRight + 60, metaY);

    doc.font('Helvetica-Bold').text('Branch:', colRight, metaY + 14);
    doc.font('Helvetica').text(invoice.branch_id, colRight + 60, metaY + 14);

    doc.font('Helvetica-Bold').text('Status:', colRight, metaY + 28);
    doc.font('Helvetica').text(invoice.status.toUpperCase(), colRight + 60, metaY + 28);

    // Customer (optional)
    if (invoice.customer_id) {
      doc.font('Helvetica-Bold').text('Customer:', margin, metaY + 42);
      doc.font('Helvetica').text(invoice.customer_id, margin + 75, metaY + 42);
    }

    // ─── ITEMS TABLE ───────────────────────────────────────────────
    const tableTop = 220;

    // Table header background
    doc.rect(margin, tableTop, contentWidth, 18).fill('#f0f0f0');

    // Table headers
    doc.fillColor('#000000').fontSize(8).font('Helvetica-Bold');
    doc.text('#', margin + 4, tableTop + 5);
    doc.text('Product', margin + 20, tableTop + 5);
    doc.text('Qty', margin + 230, tableTop + 5);
    doc.text('Unit Price', margin + 270, tableTop + 5);
    doc.text('VAT', margin + 340, tableTop + 5);
    doc.text('Line Total', margin + 390, tableTop + 5, { width: 55, align: 'right' });

    // Table rows
    let rowY = tableTop + 22;
    invoice.items.forEach((item: any, index: number) => {
      const lineTotal = item.line_total + item.line_tax;

      // Alternating row color
      if (index % 2 === 0) {
        doc.rect(margin, rowY - 3, contentWidth, 16).fill('#fafafa');
      }

      doc.fillColor('#000000').fontSize(8).font('Helvetica');
      doc.text(String(index + 1), margin + 4, rowY);
      doc.text(item.product_id, margin + 20, rowY, { width: 200 });
      doc.text(String(item.quantity), margin + 230, rowY);
      doc.text(
        `${Number(item.unit_price).toFixed(2)}`,
        margin + 270,
        rowY,
        { width: 65, align: 'right' },
      );
      doc.text(
        item.tax_category === 'standard_vat'
          ? `${Number(item.line_tax).toFixed(2)}`
          : '0.00',
        margin + 340,
        rowY,
        { width: 45, align: 'right' },
      );
      doc.text(
        `${Number(lineTotal).toFixed(2)}`,
        margin + 390,
        rowY,
        { width: 55, align: 'right' },
      );

      rowY += 16;
    });

    // Table bottom border
    doc.moveTo(margin, rowY).lineTo(pageWidth - margin, rowY).strokeColor('#cccccc').stroke();

    // ─── TOTALS ────────────────────────────────────────────────────
    rowY += 10;
    const labelX = margin + 290;
    const valueX = margin + 390;
    const valueWidth = 55;

    const addTotalRow = (label: string, value: string, bold = false) => {
      doc.font(bold ? 'Helvetica-Bold' : 'Helvetica').fontSize(9);
      doc.fillColor('#000000').text(label, labelX, rowY);
      doc.text(value, valueX, rowY, { width: valueWidth, align: 'right' });
      rowY += 14;
    };

    addTotalRow('Subtotal:', `LKR ${Number(invoice.subtotal).toFixed(2)}`);
    if (invoice.discount_total > 0) {
      addTotalRow('Discount:', `- LKR ${Number(invoice.discount_total).toFixed(2)}`);
    }
    addTotalRow('VAT (18%):', `LKR ${Number(invoice.vat_total).toFixed(2)}`);

    // Grand total highlight
    doc.rect(labelX - 5, rowY - 2, valueWidth + (valueX - labelX) + 10, 16).fill('#333333');
    doc.fillColor('#ffffff').font('Helvetica-Bold').fontSize(10);
    doc.text('GRAND TOTAL:', labelX, rowY + 1);
    doc.text(`LKR ${Number(invoice.grand_total).toFixed(2)}`, valueX, rowY + 1, {
      width: valueWidth,
      align: 'right',
    });
    rowY += 22;

    // ─── PAYMENTS ──────────────────────────────────────────────────
    doc.fillColor('#000000').fontSize(9).font('Helvetica-Bold').text('Payment Details:', margin, rowY);
    rowY += 14;

    invoice.payments.forEach((payment: any) => {
      doc.font('Helvetica').fontSize(9);
      const methodLabel = payment.payment_method.toUpperCase();
      doc.text(`${methodLabel}:`, margin + 10, rowY);
      doc.text(
        `LKR ${Number(payment.amount).toFixed(2)}`,
        margin + 100,
        rowY,
      );
      if (payment.reference) {
        doc.fillColor('#666666').text(`(Ref: ${payment.reference})`, margin + 200, rowY);
        doc.fillColor('#000000');
      }
      rowY += 13;
    });

    // Cash change
    const cashPayment = invoice.payments.find((p: any) => p.payment_method === 'cash');
    if (cashPayment) {
      const change = Number(cashPayment.amount) - Number(invoice.grand_total);
      if (change > 0) {
        doc.font('Helvetica-Bold').fontSize(9);
        doc.text('Change Given:', margin + 10, rowY);
        doc.font('Helvetica').text(`LKR ${change.toFixed(2)}`, margin + 100, rowY);
        rowY += 13;
      }
    }

    // ─── BARCODE AREA ──────────────────────────────────────────────
    rowY += 15;
    doc.moveTo(margin, rowY).lineTo(pageWidth - margin, rowY).strokeColor('#cccccc').stroke();
    rowY += 10;

    doc
      .fontSize(8)
      .font('Helvetica')
      .fillColor('#666666')
      .text(`Invoice Reference: ${invoice.id}`, margin, rowY, { align: 'center' });

    // ─── FOOTER ────────────────────────────────────────────────────
    doc
      .fontSize(8)
      .font('Helvetica')
      .fillColor('#888888')
      .text('Thank you for your business!', margin, 780, { align: 'center' })
      .text('Goods once sold will not be taken back. Please keep this invoice for warranty claims.', margin, 792, {
        align: 'center',
      });
  }
}