import PDFDocument from 'pdfkit';
import { QuotationResponse } from '../dto/quotation.dto';

export interface ShopInfo {
  shopName: string;
  address?: string;
  phone?: string;
  email?: string;
  taxNumber?: string;
  vatRegistrationNumber?: string;
}

export interface PDFGeneratorOptions {
  shopInfo: ShopInfo;
  termsConditions?: string;
}

/**
 * Generate Quotation PDF with pdfkit
 * Creates a professional PDF with shop header, quotation details, items, and totals
 * @param quotation Quotation data to render
 * @param options Shop info and terms & conditions
 * @returns Promise<Buffer> PDF document as buffer
 */
export async function generateQuotationPdf(
  quotation: QuotationResponse,
  options: PDFGeneratorOptions,
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({
        size: 'A4',
        margin: 50,
        bufferPages: true,
      });

      const chunks: Buffer[] = [];

      doc.on('data', (chunk) => chunks.push(chunk));
      doc.on('end', () => {
        resolve(Buffer.concat(chunks));
      });
      doc.on('error', reject);

      // ===== HEADER WITH SHOP INFO =====
      doc
        .fontSize(20)
        .font('Helvetica-Bold')
        .text(options.shopInfo.shopName, { align: 'left' });
      doc.fontSize(10).font('Helvetica').moveDown(0.3);

      if (options.shopInfo.address) {
        doc.text(options.shopInfo.address, { align: 'left' });
      }
      if (options.shopInfo.phone) {
        doc.text(`Phone: ${options.shopInfo.phone}`, { align: 'left' });
      }
      if (options.shopInfo.email) {
        doc.text(`Email: ${options.shopInfo.email}`, { align: 'left' });
      }
      if (options.shopInfo.vatRegistrationNumber) {
        doc.text(
          `VAT Registration: ${options.shopInfo.vatRegistrationNumber}`,
          { align: 'left' },
        );
      }

      doc.moveDown(0.5);
      doc.fontSize(14).font('Helvetica-Bold').text('QUOTATION');
      doc.moveDown(0.3);

      // ===== QUOTATION DETAILS =====
      doc
        .fontSize(10)
        .font('Helvetica')
        .text(`Quotation #: ${quotation.quotationNumber}`);
      doc.text(`Date: ${quotation.quotationDate}`);
      if (quotation.validUntil) {
        doc.text(`Valid Until: ${quotation.validUntil}`);
      }
      doc.moveDown(0.5);

      // ===== CUSTOMER DETAILS =====
      doc.fontSize(11).font('Helvetica-Bold').text('BILL TO:');
      doc.fontSize(10).font('Helvetica');
      if (quotation.customerName) {
        doc.text(quotation.customerName);
      }
      if (quotation.customerPhone) {
        doc.text(`Phone: ${quotation.customerPhone}`);
      }
      doc.moveDown(0.5);

      // ===== ITEMS TABLE =====
      const colX = { item: 50, qty: 280, unitPrice: 340, discount: 410, tax: 450, total: 500 };
      const headerY = doc.y;

      // Table header
      doc.fontSize(10).font('Helvetica-Bold');
      doc.text('Item', colX.item, headerY);
      doc.text('Qty', colX.qty, headerY);
      doc.text('Unit Price', colX.unitPrice, headerY);
      doc.text('Discount%', colX.discount, headerY);
      doc.text('Tax%', colX.tax, headerY);
      doc.text('Total', colX.total, headerY);

      // Horizontal line
      doc
        .moveTo(colX.item, headerY + 15)
        .lineTo(550, headerY + 15)
        .stroke();

      doc.moveDown(1.2);
      doc.fontSize(9).font('Helvetica');

      // Items rows
      let itemY = doc.y;
      quotation.items.forEach((item) => {
        const itemName = (item.productName || '').substring(0, 25);
        doc.text(itemName, colX.item, itemY);
        doc.text(item.quantity || '0', colX.qty, itemY);
        doc.text(item.unitPrice || '0.00', colX.unitPrice, itemY);
        doc.text(item.discountPercentage || '0', colX.discount, itemY);
        doc.text(item.taxRate || '0', colX.tax, itemY);
        doc.text(item.lineTotal || '0.00', colX.total, itemY);
        itemY += 20;
      });

      // ===== SUMMARY SECTION =====
      doc.moveDown(1);
      const summaryX = 350;
      const summaryY = doc.y;

      doc.fontSize(10).font('Helvetica');
      doc.text('Subtotal:', summaryX, summaryY);
      doc.text(quotation.subtotal || '0.00', summaryX + 120, summaryY, { align: 'right' });

      doc.text('Discount:', summaryX, summaryY + 20);
      doc.text(quotation.discountAmount || '0.00', summaryX + 120, summaryY + 20, {
        align: 'right',
      });

      doc.text('Tax:', summaryX, summaryY + 40);
      doc.text(quotation.taxAmount || '0.00', summaryX + 120, summaryY + 40, {
        align: 'right',
      });

      // Total with border
      doc
        .rect(summaryX - 10, summaryY + 55, 180, 25)
        .stroke();
      doc.fontSize(12).font('Helvetica-Bold');
      doc.text('TOTAL:', summaryX, summaryY + 63);
      doc.text(quotation.totalAmount || '0.00', summaryX + 120, summaryY + 63, {
        align: 'right',
      });

      // ===== FOOTER WITH TERMS & CONDITIONS =====
      doc.moveDown(2);
      doc.fontSize(9).font('Helvetica');
      doc.text('─'.repeat(85), { align: 'center' });
      doc.moveDown(0.3);

      if (options.termsConditions) {
        doc.fontSize(9).font('Helvetica-Bold').text('TERMS & CONDITIONS:');
        doc.fontSize(8).font('Helvetica').text(options.termsConditions, {
          align: 'left',
          width: 450,
        });
      }

      doc.fontSize(8).text(`Generated on ${new Date().toLocaleString()}`, {
        align: 'center',
      });

      doc.end();
    } catch (error) {
      reject(error);
    }
  });
}

/**
 * Format quotation for email
 * @param quotation Quotation data
 * @returns HTML string for email body
 */
export function formatQuotationForEmail(quotation: QuotationResponse): string {
  const itemsHtml = quotation.items
    .map(
      (item) =>
        `
    <tr>
      <td style="padding: 8px; border-bottom: 1px solid #ddd;">${item.productName}</td>
      <td style="padding: 8px; border-bottom: 1px solid #ddd; text-align: right;">${item.quantity}</td>
      <td style="padding: 8px; border-bottom: 1px solid #ddd; text-align: right;">${item.unitPrice}</td>
      <td style="padding: 8px; border-bottom: 1px solid #ddd; text-align: right;">${item.lineTotal}</td>
    </tr>
  `,
    )
    .join('');

  return `
    <h2>Quotation: ${quotation.quotationNumber}</h2>
    <p><strong>Customer:</strong> ${quotation.customerName}</p>
    <p><strong>Date:</strong> ${quotation.quotationDate}</p>
    <p><strong>Valid Until:</strong> ${quotation.validUntil || 'N/A'}</p>
    
    <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
      <thead>
        <tr style="background-color: #f5f5f5;">
          <th style="padding: 8px; text-align: left; border-bottom: 2px solid #333;">Item</th>
          <th style="padding: 8px; text-align: right; border-bottom: 2px solid #333;">Qty</th>
          <th style="padding: 8px; text-align: right; border-bottom: 2px solid #333;">Unit Price</th>
          <th style="padding: 8px; text-align: right; border-bottom: 2px solid #333;">Total</th>
        </tr>
      </thead>
      <tbody>
        ${itemsHtml}
      </tbody>
    </table>
    
    <div style="text-align: right; margin: 20px 0;">
      <p><strong>Subtotal:</strong> ${quotation.subtotal}</p>
      <p><strong>Discount:</strong> ${quotation.discountAmount}</p>
      <p><strong>Tax:</strong> ${quotation.taxAmount}</p>
      <h3><strong>TOTAL: ${quotation.totalAmount}</strong></h3>
    </div>
  `;
}
