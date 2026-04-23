import { Injectable, Logger } from '@nestjs/common';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';

@Injectable()
export class PdfService {
  private readonly logger = new Logger(PdfService.name);

  async generateInvoicePdf(invoiceData: {
    invoiceNumber: string;
    customerEmail: string;
    grandTotal?: number;
  }): Promise<Buffer> {
    try {
      const pdfDoc = await PDFDocument.create();
      const page = pdfDoc.addPage([595, 842]); // A4
      const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
      const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

      // Header
      page.drawText('ABC Hardware', {
        x: 50, y: 780,
        size: 24, font: boldFont,
        color: rgb(0.2, 0.2, 0.2),
      });

      page.drawText('INVOICE', {
        x: 50, y: 750,
        size: 18, font: boldFont,
        color: rgb(0.1, 0.5, 0.8),
      });

      // Line
      page.drawLine({
        start: { x: 50, y: 740 },
        end: { x: 545, y: 740 },
        thickness: 1,
        color: rgb(0.7, 0.7, 0.7),
      });

      // Invoice details
      page.drawText(`Invoice Number: ${invoiceData.invoiceNumber}`, {
        x: 50, y: 710, size: 12, font: boldFont,
      });

      page.drawText(`Customer: ${invoiceData.customerEmail}`, {
        x: 50, y: 690, size: 11, font,
      });

      page.drawText(`Date: ${new Date().toLocaleDateString()}`, {
        x: 50, y: 670, size: 11, font,
      });

      // Total
      page.drawLine({
        start: { x: 50, y: 640 },
        end: { x: 545, y: 640 },
        thickness: 1,
        color: rgb(0.7, 0.7, 0.7),
      });

      page.drawText(`Grand Total: Rs. ${invoiceData.grandTotal?.toLocaleString() || '0'}`, {
        x: 50, y: 615,
        size: 16, font: boldFont,
        color: rgb(0.1, 0.5, 0.1),
      });

      // Footer
      page.drawText('Thank you for your business!', {
        x: 50, y: 100, size: 12, font,
        color: rgb(0.5, 0.5, 0.5),
      });

      const pdfBytes = await pdfDoc.save();
      return Buffer.from(pdfBytes);
    } catch (error) {
      this.logger.error('Failed to generate invoice PDF', error);
      throw error;
    }
  }

  async generateQuotationPdf(quotationData: {
    quotationNumber: string;
    customerEmail: string;
    grandTotal?: number;
  }): Promise<Buffer> {
    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage([595, 842]);
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

    page.drawText('ABC Hardware', { x: 50, y: 780, size: 24, font: boldFont });
    page.drawText('QUOTATION', { x: 50, y: 750, size: 18, font: boldFont, color: rgb(0.8, 0.5, 0.1) });
    page.drawText(`Quotation: ${quotationData.quotationNumber}`, { x: 50, y: 710, size: 12, font: boldFont });
    page.drawText(`Customer: ${quotationData.customerEmail}`, { x: 50, y: 690, size: 11, font });
    page.drawText(`Date: ${new Date().toLocaleDateString()}`, { x: 50, y: 670, size: 11, font });
    page.drawText(`Total: Rs. ${quotationData.grandTotal?.toLocaleString() || '0'}`, { x: 50, y: 615, size: 16, font: boldFont });

    const pdfBytes = await pdfDoc.save();
    return Buffer.from(pdfBytes);
  }

  async generatePurchaseOrderPdf(poData: {
    poNumber: string;
    supplierEmail: string;
    grandTotal?: number;
  }): Promise<Buffer> {
    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage([595, 842]);
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

    page.drawText('ABC Hardware', { x: 50, y: 780, size: 24, font: boldFont });
    page.drawText('PURCHASE ORDER', { x: 50, y: 750, size: 18, font: boldFont, color: rgb(0.5, 0.1, 0.8) });
    page.drawText(`PO Number: ${poData.poNumber}`, { x: 50, y: 710, size: 12, font: boldFont });
    page.drawText(`Supplier: ${poData.supplierEmail}`, { x: 50, y: 690, size: 11, font });
    page.drawText(`Date: ${new Date().toLocaleDateString()}`, { x: 50, y: 670, size: 11, font });
    page.drawText(`Total: Rs. ${poData.grandTotal?.toLocaleString() || '0'}`, { x: 50, y: 615, size: 16, font: boldFont });

    const pdfBytes = await pdfDoc.save();
    return Buffer.from(pdfBytes);
  }
}