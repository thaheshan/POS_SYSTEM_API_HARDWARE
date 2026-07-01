import { BasePDFGenerator } from '../../../common/pdf/base-pdf-generator';
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
 * Quotation PDF Generator
 * Extends BasePDFGenerator for consistent styling and structure
 * Specific to quotation document generation
 */
class QuotationPDFGenerator extends BasePDFGenerator {
  private quotation: QuotationResponse;
  private options: PDFGeneratorOptions;

  constructor(quotation: QuotationResponse, options: PDFGeneratorOptions) {
    super();
    this.quotation = quotation;
    this.options = options;
  }

  async generate(): Promise<Buffer> {
    // Render header with shop info
    this.renderHeader(this.options.shopInfo);

    // Render document title
    this.renderSectionTitle('QUOTATION');

    // Render quotation details
    this.renderKeyValue('Quotation #', this.quotation.quotationNumber);
    this.renderKeyValue('Date', this.quotation.quotationDate);
    if (this.quotation.validUntil) {
      this.renderKeyValue('Valid Until', this.quotation.validUntil);
    }
    this.doc.moveDown(this.SPACING.ITEM_GAP);

    // Render customer details
    this.renderSectionTitle('BILL TO');
    if (this.quotation.customerName) {
      this.doc.text(this.quotation.customerName);
    }
    if (this.quotation.customerPhone) {
      this.doc.text(`Phone: ${this.quotation.customerPhone}`);
    }
    this.doc.moveDown(this.SPACING.SECTION_GAP);

    // Render items table
    this.renderItemsTable();

    // Render financial summary
    this.renderFinancialSummary();

    // Render footer
    this.renderFooter(this.options.termsConditions);

    return this.getBuffer();
  }

  /**
   * Render items table with quotation-specific columns
   */
  private renderItemsTable(): void {
    const columns = [
      {
        header: 'Item',
        key: 'productName',
        width: 150,
        align: 'left' as const,
      },
      { header: 'Qty', key: 'quantity', width: 60, align: 'right' as const },
      {
        header: 'Unit Price',
        key: 'unitPrice',
        width: 80,
        align: 'right' as const,
      },
      {
        header: 'Discount%',
        key: 'discountPercentage',
        width: 70,
        align: 'right' as const,
      },
      { header: 'Tax%', key: 'taxRate', width: 60, align: 'right' as const },
      { header: 'Total', key: 'lineTotal', width: 80, align: 'right' as const },
    ];

    const rows = this.quotation.items.map((item) => ({
      productName: item.productName || '',
      quantity: item.quantity || '0',
      unitPrice: this.formatCurrency(item.unitPrice || '0'),
      discountPercentage: item.discountPercentage
        ? `${item.discountPercentage}%`
        : '-',
      taxRate: item.taxRate ? `${item.taxRate}%` : '-',
      lineTotal: this.formatCurrency(item.lineTotal || '0'),
    }));

    this.renderTable(columns, rows);
  }

  /**
   * Render financial summary (subtotal, discount, tax, total)
   */
  private renderFinancialSummary(): void {
    this.renderSummary([
      {
        label: 'Subtotal',
        value: this.formatCurrency(this.quotation.subtotal || '0'),
      },
      {
        label: 'Discount',
        value: this.formatCurrency(this.quotation.discountAmount || '0'),
      },
      {
        label: 'Tax',
        value: this.formatCurrency(this.quotation.taxAmount || '0'),
      },
      {
        label: 'TOTAL',
        value: this.formatCurrency(this.quotation.totalAmount || '0'),
        isBold: true,
        isTotal: true,
      },
    ]);
  }
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
  const generator = new QuotationPDFGenerator(quotation, options);
  return generator.generate();
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
