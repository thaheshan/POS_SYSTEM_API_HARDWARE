import PDFDocument from 'pdfkit';

/**
 * Base PDF Generator
 * Provides common PDF generation utilities: headers, footers, tables, fonts, etc.
 * Extend this class and override specific methods for document-type-specific behavior
 *
 * Usage:
 *   class QuotationPDFGenerator extends BasePDFGenerator {
 *     async generate(quotation: Quotation): Promise<Buffer> {
 *       this.renderHeader();
 *       this.renderQuotationDetails(quotation);
 *       this.renderItemsTable(quotation.items);
 *       this.renderFooter();
 *       return this.getBuffer();
 *     }
 *   }
 */
export abstract class BasePDFGenerator {
  protected doc: InstanceType<typeof PDFDocument>;
  protected chunks: Buffer[] = [];

  // Font configuration (consistent across all PDFs)
  protected readonly FONTS = {
    HEADER: { name: 'Helvetica-Bold', size: 20 },
    TITLE: { name: 'Helvetica-Bold', size: 14 },
    LABEL: { name: 'Helvetica-Bold', size: 10 },
    BODY: { name: 'Helvetica', size: 10 },
    FOOTER: { name: 'Helvetica', size: 8 },
  } as const;

  // Color scheme (consistent across all PDFs)
  protected readonly COLORS = {
    PRIMARY: '#2c3e50',
    ACCENT: '#3498db',
    BORDER: '#bdc3c7',
    TEXT: '#2c3e50',
    TEXT_LIGHT: '#7f8c8d',
    BACKGROUND: '#ecf0f1',
  } as const;

  // Spacing configuration (consistent across all PDFs)
  protected readonly SPACING = {
    MARGIN: 50,
    SECTION_GAP: 0.8,
    ITEM_GAP: 0.3,
    LINE_HEIGHT: 1.2,
  } as const;

  // Table configuration for items/line items
  protected readonly TABLE = {
    HEADER_HEIGHT: 25,
    ROW_HEIGHT: 20,
    COL_PADDING: 8,
  } as const;

  constructor() {
    this.doc = new PDFDocument({
      size: 'A4',
      margin: this.SPACING.MARGIN,
      bufferPages: true,
    });

    this.doc.on('data', (chunk) => this.chunks.push(chunk));
    this.doc.on('error', (err) => {
      throw err;
    });
  }

  /**
   * Get final PDF as Buffer
   * Call this after rendering all content
   */
  async getBuffer(): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      this.doc.on('end', () => {
        resolve(Buffer.concat(this.chunks));
      });
      this.doc.on('error', reject);
      this.doc.end();
    });
  }

  /**
   * Render standard header with shop/company info
   */
  protected renderHeader(companyInfo: {
    shopName: string;
    address?: string;
    phone?: string;
    email?: string;
    vatRegistrationNumber?: string;
  }): void {
    this.doc
      .fontSize(this.FONTS.HEADER.size)
      .font(this.FONTS.HEADER.name)
      .fillColor(this.COLORS.PRIMARY)
      .text(companyInfo.shopName, { align: 'left' });

    this.doc
      .fontSize(this.FONTS.BODY.size)
      .font(this.FONTS.BODY.name)
      .moveDown(0.3);

    if (companyInfo.address) {
      this.doc.fillColor(this.COLORS.TEXT).text(companyInfo.address);
    }
    if (companyInfo.phone) {
      this.doc.text(`Phone: ${companyInfo.phone}`);
    }
    if (companyInfo.email) {
      this.doc.text(`Email: ${companyInfo.email}`);
    }
    if (companyInfo.vatRegistrationNumber) {
      this.doc.text(`VAT Registration: ${companyInfo.vatRegistrationNumber}`);
    }

    this.doc.moveDown(this.SPACING.SECTION_GAP);
    this.drawHorizontalLine();
    this.doc.moveDown(this.SPACING.SECTION_GAP);
  }

  /**
   * Render section title
   */
  protected renderSectionTitle(title: string): void {
    this.doc
      .fontSize(this.FONTS.TITLE.size)
      .font(this.FONTS.TITLE.name)
      .fillColor(this.COLORS.PRIMARY)
      .text(title);
    this.doc.moveDown(this.SPACING.ITEM_GAP);
  }

  /**
   * Render key-value pair (label: value)
   */
  protected renderKeyValue(label: string, value: string): void {
    const labelWidth = 120;
    const startX = this.doc.x;
    const startY = this.doc.y;

    this.doc
      .fontSize(this.FONTS.LABEL.size)
      .font(this.FONTS.LABEL.name)
      .fillColor(this.COLORS.TEXT)
      .text(label, startX, startY, { width: labelWidth });

    this.doc
      .fontSize(this.FONTS.BODY.size)
      .font(this.FONTS.BODY.name)
      .fillColor(this.COLORS.TEXT)
      .text(value, startX + labelWidth + 10, startY);

    this.doc.moveDown(this.SPACING.ITEM_GAP);
  }

  /**
   * Render a table with headers and rows
   */
  protected renderTable(
    columns: Array<{
      header: string;
      key: string;
      width: number;
      align?: 'left' | 'right' | 'center';
    }>,
    rows: Record<string, any>[],
  ): void {
    const pageHeight = this.doc.page.height;
    const bottomMargin = 50;
    const tableStartY = this.doc.y;

    // Render headers
    this.doc
      .fontSize(this.FONTS.LABEL.size)
      .font(this.FONTS.LABEL.name)
      .fillColor(this.COLORS.PRIMARY)
      .rect(
        this.doc.x,
        this.doc.y,
        columns.reduce((sum, col) => sum + col.width, 0),
        this.TABLE.HEADER_HEIGHT,
      )
      .fill(this.COLORS.BACKGROUND);

    let currentX = this.doc.x;
    columns.forEach((col) => {
      this.doc.text(
        col.header,
        currentX + this.TABLE.COL_PADDING,
        tableStartY + 5,
        {
          width: col.width - this.TABLE.COL_PADDING * 2,
          align: col.align || 'left',
        },
      );
      currentX += col.width;
    });

    this.doc.moveDown(this.TABLE.HEADER_HEIGHT / 12);

    // Render rows
    rows.forEach((row) => {
      const rowStartY = this.doc.y;
      let maxHeight = this.TABLE.ROW_HEIGHT;

      // Check if we need to go to next page
      if (this.doc.y + this.TABLE.ROW_HEIGHT > pageHeight - bottomMargin) {
        this.doc.addPage();
      }

      // Render row cells
      currentX = this.doc.x;
      columns.forEach((col) => {
        const value = String(row[col.key] || '');
        this.doc
          .fontSize(this.FONTS.BODY.size)
          .font(this.FONTS.BODY.name)
          .fillColor(this.COLORS.TEXT)
          .text(value, currentX + this.TABLE.COL_PADDING, rowStartY, {
            width: col.width - this.TABLE.COL_PADDING * 2,
            align: col.align || 'left',
          });
        currentX += col.width;
      });

      this.doc.y = rowStartY + this.TABLE.ROW_HEIGHT;
    });

    this.doc.moveDown(this.SPACING.SECTION_GAP);
  }

  /**
   * Render summary section (totals, subtotal, tax, etc.)
   */
  protected renderSummary(
    rows: Array<{
      label: string;
      value: string;
      isBold?: boolean;
      isTotal?: boolean;
    }>,
  ): void {
    const rightMargin = this.doc.page.width - this.SPACING.MARGIN;
    const labelWidth = 100;
    const valueWidth = 80;

    this.doc.moveDown(this.SPACING.ITEM_GAP);

    rows.forEach((row) => {
      const labelX = rightMargin - labelWidth - valueWidth - 20;
      const valueX = rightMargin - valueWidth;

      if (row.isTotal) {
        // Draw border around total
        const rowHeight = 25;
        this.doc
          .rect(
            labelX - 10,
            this.doc.y - 2,
            labelWidth + valueWidth + 20,
            rowHeight,
          )
          .stroke(this.COLORS.PRIMARY);
      }

      this.doc
        .fontSize(row.isBold ? this.FONTS.LABEL.size : this.FONTS.BODY.size)
        .font(row.isBold ? this.FONTS.LABEL.name : this.FONTS.BODY.name)
        .fillColor(this.COLORS.TEXT)
        .text(row.label, labelX, this.doc.y, {
          width: labelWidth,
          align: 'left',
        });

      this.doc
        .fontSize(row.isBold ? this.FONTS.LABEL.size : this.FONTS.BODY.size)
        .font(row.isBold ? this.FONTS.LABEL.name : this.FONTS.BODY.name)
        .fillColor(this.COLORS.TEXT)
        .text(row.value, valueX, this.doc.y - this.FONTS.BODY.size, {
          width: valueWidth,
          align: 'right',
        });

      this.doc.moveDown(row.isTotal ? 1.5 : this.SPACING.LINE_HEIGHT);
    });
  }

  /**
   * Draw horizontal line separator
   */
  protected drawHorizontalLine(color: string = this.COLORS.BORDER): void {
    const y = this.doc.y;
    this.doc
      .strokeColor(color)
      .lineWidth(0.5)
      .moveTo(this.SPACING.MARGIN, y)
      .lineTo(this.doc.page.width - this.SPACING.MARGIN, y)
      .stroke();
  }

  /**
   * Render standard footer with timestamp and terms
   */
  protected renderFooter(termsConditions?: string): void {
    this.doc.moveDown(this.SPACING.SECTION_GAP);
    this.drawHorizontalLine();
    this.doc.moveDown(this.SPACING.ITEM_GAP);

    if (termsConditions) {
      this.doc
        .fontSize(this.FONTS.FOOTER.size)
        .font(this.FONTS.BODY.name)
        .fillColor(this.COLORS.TEXT_LIGHT)
        .text(`Terms & Conditions: ${termsConditions}`, {
          width: this.doc.page.width - this.SPACING.MARGIN * 2,
        });
    }

    const now = new Date();
    const generatedAt = now.toLocaleString('en-US', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });

    this.doc
      .fontSize(this.FONTS.FOOTER.size)
      .font(this.FONTS.BODY.name)
      .fillColor(this.COLORS.TEXT_LIGHT)
      .text(`Generated: ${generatedAt}`, {
        align: 'center',
      });
  }

  /**
   * Format number as currency
   */
  protected formatCurrency(amount: string | number): string {
    const num = typeof amount === 'string' ? parseFloat(amount) : amount;
    return num.toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  }

  /**
   * Format date to readable string
   */
  protected formatDate(date: Date | string): string {
    const d = typeof date === 'string' ? new Date(date) : date;
    return d.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  }

  /**
   * Abstract method - override in subclasses
   */
  abstract generate(): Promise<Buffer>;
}
