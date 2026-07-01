import PDFDocument from 'pdfkit';
import type PDFKit from 'pdfkit';
import { ReportResponseDto } from '../dtos/report-response.dto';

/**
 * PDF Report Generator for End-of-Day Reports
 * Generates professional PDF reports with all sections
 */
export class ReportPdfGenerator {
  /**
   * Generate End-of-Day Report PDF
   * Creates a comprehensive report with KPIs, breakdowns, rankings, and alerts
   * @param report Report data
   * @returns Promise<Buffer> PDF document as buffer
   */
  static async generateReportPdf(report: ReportResponseDto): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument({
          size: 'A4',
          margin: 40,
          bufferPages: true,
        });

        const chunks: Buffer[] = [];

        doc.on('data', (chunk) => chunks.push(chunk));
        doc.on('end', () => {
          resolve(Buffer.concat(chunks));
        });
        doc.on('error', reject);

        // ===== HEADER SECTION =====
        ReportPdfGenerator.drawHeader(doc, report);

        // ===== KPI SECTION =====
        ReportPdfGenerator.drawKpis(doc, report);

        // ===== PAYMENT BREAKDOWN SECTION =====
        ReportPdfGenerator.drawPaymentBreakdown(doc, report);

        // ===== PROFIT & VAT SECTION =====
        ReportPdfGenerator.drawProfitVatPanel(doc, report);

        // ===== CATEGORY RANKINGS TABLE =====
        ReportPdfGenerator.drawCategoryRankings(doc, report);

        // ===== STAFF PERFORMANCE =====
        ReportPdfGenerator.drawStaffPerformance(doc, report);

        // ===== INVENTORY ALERTS =====
        if (
          report.low_stock_items.length > 0 ||
          report.out_of_stock_items.length > 0
        ) {
          ReportPdfGenerator.drawInventoryAlerts(doc, report);
        }

        // ===== FOOTER =====
        ReportPdfGenerator.drawFooter(doc, report);

        doc.end();
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Draw report header with shop info and title
   */
  private static drawHeader(
    doc: InstanceType<typeof PDFDocument>,
    report: ReportResponseDto,
  ): void {
    doc
      .fontSize(18)
      .font('Helvetica-Bold')
      .text('END-OF-DAY REPORT', { align: 'center' });

    doc
      .fontSize(10)
      .font('Helvetica')
      .moveDown(0.3)
      .text('Shop Report', { align: 'center' });

    doc
      .fontSize(11)
      .font('Helvetica-Bold')
      .moveDown(0.5)
      .text(`Report Date: ${report.report_date}`);

    if (report.branch_id) {
      doc.fontSize(10).font('Helvetica').text(`Branch: ${report.branch_id}`);
    }

    doc.moveDown(0.5);
    doc.moveTo(40, doc.y).lineTo(555, doc.y).stroke();
    doc.moveDown(0.5);
  }

  /**
   * Draw KPI section with graphs-like boxes
   */
  private static drawKpis(
    doc: InstanceType<typeof PDFDocument>,
    report: ReportResponseDto,
  ): void {
    doc.fontSize(12).font('Helvetica-Bold').text('KEY PERFORMANCE INDICATORS');
    doc.moveDown(0.3);

    const kpiBoxX = [50, 250, 450];
    const kpiBoxY = doc.y;
    const boxWidth = 140;
    const boxHeight = 45;

    // Revenue
    ReportPdfGenerator.drawKpiBox(
      doc,
      kpiBoxX[0],
      kpiBoxY,
      boxWidth,
      boxHeight,
      [
        ['TOTAL REVENUE', `${report.total_revenue.toFixed(2)}`],
        [
          `Transactions: ${report.total_transactions}`,
          `Avg: ${report.average_bill.toFixed(2)}`,
        ],
      ],
    );

    // Profit
    ReportPdfGenerator.drawKpiBox(
      doc,
      kpiBoxX[1],
      kpiBoxY,
      boxWidth,
      boxHeight,
      [
        ['GROSS PROFIT', `${report.gross_profit.toFixed(2)}`],
        [
          `Net Profit: ${report.net_profit.toFixed(2)}`,
          `Margin: ${((report.net_profit / report.total_revenue) * 100).toFixed(1)}%`,
        ],
      ],
    );

    // VAT
    ReportPdfGenerator.drawKpiBox(
      doc,
      kpiBoxX[2],
      kpiBoxY,
      boxWidth,
      boxHeight,
      [
        ['VAT COLLECTED', `${report.vat_collected.toFixed(2)}`],
        [
          `COGS: ${report.cogs.toFixed(2)}`,
          `VAT Paid: ${report.vat_paid.toFixed(2)}`,
        ],
      ],
    );

    doc.y = kpiBoxY + boxHeight + 15;
    doc.moveDown(0.3);
  }

  /**
   * Draw a KPI info box
   */
  private static drawKpiBox(
    doc: InstanceType<typeof PDFDocument>,
    x: number,
    y: number,
    width: number,
    height: number,
    lines: [string, string][],
  ): void {
    // Draw border
    doc.rect(x, y, width, height).stroke();

    // Draw content
    doc.fontSize(8).font('Helvetica-Bold');
    const lineHeight = height / (lines.length + 0.5);
    let currentY = y + 5;

    lines.forEach(([left, right]) => {
      doc.text(left, x + 5, currentY, { width: width - 10, align: 'left' });
      doc.text(right, x + 5, currentY, { width: width - 10, align: 'right' });
      currentY += lineHeight;
    });

    doc.font('Helvetica');
  }

  /**
   * Draw payment breakdown section
   */
  private static drawPaymentBreakdown(
    doc: InstanceType<typeof PDFDocument>,
    report: ReportResponseDto,
  ): void {
    doc
      .fontSize(11)
      .font('Helvetica-Bold')
      .moveDown(0.5)
      .text('PAYMENT BREAKDOWN');
    doc.fontSize(10).font('Helvetica');

    const breakdown = report.payment_breakdown;
    const methods = [
      {
        label: 'Cash',
        amount: breakdown.cash,
        pct: breakdown.percentages.cash,
      },
      {
        label: 'Card',
        amount: breakdown.card,
        pct: breakdown.percentages.card,
      },
      {
        label: 'Credit',
        amount: breakdown.credit,
        pct: breakdown.percentages.credit,
      },
    ];

    const boxX = 50;
    let boxY = doc.y;

    methods.forEach((method) => {
      const pctBar = method.pct ? Math.round(method.pct / 2) : 0; // Scale to 50px max
      doc.text(
        `${method.label}: ${method.amount.toFixed(2)} (${method.pct?.toFixed(1) || 0}%)`,
        boxX,
        boxY,
      );

      // Draw percentage bar
      if (pctBar > 0) {
        doc.rect(boxX + 130, boxY + 2, pctBar, 8).fill('#4CAF50');
        doc.text('', boxX, boxY, { link: null }); // Reset fill
      }

      boxY += 18;
    });

    doc.moveDown(0.5);
  }

  /**
   * Draw profit and VAT panel
   */
  private static drawProfitVatPanel(
    doc: InstanceType<typeof PDFDocument>,
    report: ReportResponseDto,
  ): void {
    doc
      .fontSize(11)
      .font('Helvetica-Bold')
      .moveDown(0.3)
      .text('FINANCIAL SUMMARY');
    doc.fontSize(10).font('Helvetica');

    const summaryX = 50;
    let summaryY = doc.y;
    const labelWidth = 200;

    doc.text('Revenue', summaryX, summaryY);
    doc.text(report.total_revenue.toFixed(2), summaryX + labelWidth, summaryY, {
      align: 'right',
    });

    summaryY += 18;
    doc.text('Cost of Goods Sold', summaryX, summaryY);
    doc.text(report.cogs.toFixed(2), summaryX + labelWidth, summaryY, {
      align: 'right',
    });

    summaryY += 18;
    doc.text('Gross Profit', summaryX, summaryY);
    doc.text(report.gross_profit.toFixed(2), summaryX + labelWidth, summaryY, {
      align: 'right',
    });

    summaryY += 18;
    doc.text('Operating Expenses', summaryX, summaryY);
    doc.text(
      report.operating_expenses.toFixed(2),
      summaryX + labelWidth,
      summaryY,
      {
        align: 'right',
      },
    );

    summaryY += 20;
    doc.fontSize(11).font('Helvetica-Bold');
    doc.text('Net Profit', summaryX, summaryY);
    doc.text(report.net_profit.toFixed(2), summaryX + labelWidth, summaryY, {
      align: 'right',
    });

    summaryY += 20;
    doc.fontSize(10).font('Helvetica');
    doc.text('VAT Collected', summaryX, summaryY);
    doc.text(report.vat_collected.toFixed(2), summaryX + labelWidth, summaryY, {
      align: 'right',
    });

    summaryY += 18;
    doc.text('VAT Paid', summaryX, summaryY);
    doc.text(report.vat_paid.toFixed(2), summaryX + labelWidth, summaryY, {
      align: 'right',
    });

    doc.moveDown(1);
  }

  /**
   * Draw category rankings table
   */
  private static drawCategoryRankings(
    doc: InstanceType<typeof PDFDocument>,
    report: ReportResponseDto,
  ): void {
    if (!report.category_rankings || report.category_rankings.length === 0) {
      return;
    }

    doc
      .fontSize(11)
      .font('Helvetica-Bold')
      .moveDown(0.3)
      .text('CATEGORY RANKINGS');
    doc.moveDown(0.2);

    // Table headers
    const colX = {
      rank: 50,
      category: 80,
      revenue: 230,
      pct: 310,
      margin: 390,
      vs: 460,
    };
    const headerY = doc.y;

    doc.fontSize(9).font('Helvetica-Bold');
    doc.text('Rank', colX.rank, headerY);
    doc.text('Category', colX.category, headerY);
    doc.text('Revenue', colX.revenue, headerY);
    doc.text('%', colX.pct, headerY);
    doc.text('Margin', colX.margin, headerY);
    doc.text('vs Yesterday', colX.vs, headerY);

    // Line
    doc
      .moveTo(50, headerY + 15)
      .lineTo(540, headerY + 15)
      .stroke();

    doc.moveDown(1);
    doc.fontSize(8).font('Helvetica');

    const rankings = (report.category_rankings || []).slice(0, 10); // Show top 10
    let rowY = doc.y;

    rankings.forEach((cat, index) => {
      const vsText = cat.vs_yesterday_pct
        ? `${cat.vs_yesterday_pct > 0 ? '+' : ''}${cat.vs_yesterday_pct.toFixed(1)}%`
        : 'N/A';

      doc.text((index + 1).toString(), colX.rank, rowY);
      doc.text((cat.name || '').substring(0, 15), colX.category, rowY);
      doc.text(cat.revenue.toFixed(2), colX.revenue, rowY, { align: 'right' });
      doc.text((cat.revenue_pct || 0).toFixed(1) + '%', colX.pct, rowY, {
        align: 'right',
      });
      doc.text((cat.profit_margin || 0).toFixed(1) + '%', colX.margin, rowY, {
        align: 'right',
      });
      doc.text(vsText, colX.vs, rowY, { align: 'right' });

      rowY += 15;
    });

    doc.moveDown(0.5);
  }

  /**
   * Draw staff performance leaderboard
   */
  private static drawStaffPerformance(
    doc: InstanceType<typeof PDFDocument>,
    report: ReportResponseDto,
  ): void {
    if (!report.staff_performance || report.staff_performance.length === 0) {
      return;
    }

    doc
      .fontSize(11)
      .font('Helvetica-Bold')
      .moveDown(0.3)
      .text('STAFF PERFORMANCE');
    doc.moveDown(0.2);

    // Table headers
    const colX = { rank: 50, staff: 100, transactions: 280, revenue: 380 };
    const headerY = doc.y;

    doc.fontSize(9).font('Helvetica-Bold');
    doc.text('Rank', colX.rank, headerY);
    doc.text('Cashier', colX.staff, headerY);
    doc.text('Transactions', colX.transactions, headerY);
    doc.text('Revenue', colX.revenue, headerY);

    // Line
    doc
      .moveTo(50, headerY + 15)
      .lineTo(540, headerY + 15)
      .stroke();

    doc.moveDown(1);
    doc.fontSize(8).font('Helvetica');

    const sorted = (report.staff_performance || [])
      .sort((a, b) => (b.revenue || 0) - (a.revenue || 0))
      .slice(0, 10); // Top 10

    let rowY = doc.y;
    sorted.forEach((staff, index) => {
      doc.text((index + 1).toString(), colX.rank, rowY);
      doc.text((staff.name || 'Unknown').substring(0, 20), colX.staff, rowY);
      doc.text((staff.transactions || 0).toString(), colX.transactions, rowY, {
        align: 'right',
      });
      doc.text((staff.revenue || 0).toFixed(2), colX.revenue, rowY, {
        align: 'right',
      });

      rowY += 15;
    });

    doc.moveDown(0.5);
  }

  /**
   * Draw inventory alerts section
   */
  private static drawInventoryAlerts(
    doc: InstanceType<typeof PDFDocument>,
    report: ReportResponseDto,
  ): void {
    const allAlerts = [
      ...(report.low_stock_items || []).map((item) => ({
        ...item,
        status: 'Low Stock' as const,
      })),
      ...(report.out_of_stock_items || []).map((item) => ({
        ...item,
        status: 'Out of Stock' as const,
      })),
    ];

    if (allAlerts.length === 0) {
      return;
    }

    doc
      .fontSize(11)
      .font('Helvetica-Bold')
      .moveDown(0.3)
      .text('INVENTORY ALERTS');
    doc.moveDown(0.2);

    // Table headers
    const colX = { product: 50, quantity: 300, status: 400 };
    const headerY = doc.y;

    doc.fontSize(9).font('Helvetica-Bold');
    doc.text('Product', colX.product, headerY);
    doc.text('Quantity', colX.quantity, headerY);
    doc.text('Status', colX.status, headerY);

    // Line
    doc
      .moveTo(50, headerY + 15)
      .lineTo(540, headerY + 15)
      .stroke();

    doc.moveDown(1);
    doc.fontSize(8).font('Helvetica');

    const alerts = allAlerts.slice(0, 15); // Show first 15
    let rowY = doc.y;

    alerts.forEach((item) => {
      doc.text((item.name || '').substring(0, 35), colX.product, rowY);
      doc.text((item.quantity || 0).toString(), colX.quantity, rowY, {
        align: 'right',
      });
      doc.text(item.status, colX.status, rowY, {
        align: 'right',
        link: null,
      });

      rowY += 15;
    });

    doc.moveDown(0.5);
  }

  /**
   * Draw footer with generation info
   */
  private static drawFooter(
    doc: InstanceType<typeof PDFDocument>,
    report: ReportResponseDto,
  ): void {
    doc.fontSize(8).font('Helvetica').moveDown(1);
    doc.moveTo(40, doc.y).lineTo(555, doc.y).stroke();
    doc.moveDown(0.3);

    doc.text(`Generated on ${new Date().toLocaleString()}`, {
      align: 'center',
    });

    doc.text(`Report for ${report.report_date}`, { align: 'center' });
  }
}
