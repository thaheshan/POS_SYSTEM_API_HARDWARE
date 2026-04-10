import { Controller, Get, Post, Body, Query, Res } from '@nestjs/common';  // 👈 Res add
import { ApiTags, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { VatService } from './services/vat.service';
import { IncomeTaxService } from './services/income-tax.service';
import { ReportService } from './services/report.service';  // 👈 add
import { PrismaService } from '../prisma/prisma.service';
import { OfficerReportDto } from './dto/officer-report.dto';

@ApiTags('Tax')
@Controller('tax')
export class TaxController {
  constructor(
    private readonly vatService: VatService,
    private readonly incomeTaxService: IncomeTaxService,
    private readonly prisma: PrismaService,
    private readonly reportService: ReportService,  // 👈 add
  ) {}

  @Get('dashboard')
  @ApiOperation({ summary: 'Tax dashboard - YTD status' })
  @ApiQuery({ name: 'tenant_id', required: true })
  async getDashboard(@Query('tenant_id') tenantId: string) {
    const settings = await this.prisma.shopSettings.findUnique({
      where: { tenantId },
    });

    if (!settings) {
      return { message: 'Shop settings not found' };
    }

    const brackets = settings.progressiveBrackets as any[];
    const ytdIncome = await this.incomeTaxService.getYtdIncome(
      tenantId,
      settings.taxYearStart,
    );
    const estimatedTax = this.incomeTaxService.calcProgressiveTax(ytdIncome, brackets);
    const currentBracket = this.incomeTaxService.getCurrentBracket(ytdIncome, brackets);

    const [month, day] = settings.taxYearStart.split('-').map(Number);
    const now = new Date();
    let yearStart = new Date(now.getFullYear(), month - 1, day);
    if (now < yearStart) yearStart = new Date(now.getFullYear() - 1, month - 1, day);

    const vatSummary = await this.prisma.dailyTaxTracking.aggregate({
      where: {
        tenantId,
        date: { gte: yearStart },
      },
      _sum: {
        outputVat: true,
        inputVat: true,
        netVatPayable: true,
        taxableProfit: true,
      },
    });

    // Advance tax payments
    const advanceTax = await this.incomeTaxService.getAdvanceTaxPayments(
      tenantId,
      settings.taxYearStart,
    );

    // Expenses YTD
    const ytdExpenses = await this.incomeTaxService.getYtdExpenses(
      tenantId,
      yearStart,
      new Date(),
    );

    return {
      ytdTaxableIncome: ytdIncome,
      currentTaxBracket: currentBracket,
      estimatedTaxLiability: estimatedTax,
      advanceTaxPaid: advanceTax.total,
      balanceTaxDue: estimatedTax - advanceTax.total,
      ytdExpenses,
      vatSummary: {
        outputVat: vatSummary._sum.outputVat || 0,
        inputVat: vatSummary._sum.inputVat || 0,
        netVatPayable: vatSummary._sum.netVatPayable || 0,
      },
      taxYearStart: settings.taxYearStart,
      vatRate: settings.vatRate,
    };
  }

  @Get('vat-summary')
  @ApiOperation({ summary: 'Monthly VAT breakdown' })
  @ApiQuery({ name: 'tenant_id', required: true })
  @ApiQuery({ name: 'year', required: false })
  async getVatSummary(
    @Query('tenant_id') tenantId: string,
    @Query('year') year?: string,
  ) {
    const targetYear = year ? parseInt(year) : new Date().getFullYear();
    return this.vatService.getMonthlyVat(tenantId, targetYear);
  }

  @Post('officer-report')
  @ApiOperation({ summary: 'Generate tax officer compliance report PDF/Excel' })
  async generateOfficerReport(
    @Body() dto: OfficerReportDto,
    @Res() res: any,
  ) {
    const settings = await this.prisma.shopSettings.findUnique({
      where: { tenantId: dto.tenant_id },
    });

    const now = new Date();
    let from: Date;
    let to: Date = now;

    if (dto.period === 'current_year' || !dto.period) {
      const [month, day] = (settings?.taxYearStart || '04-01').split('-').map(Number);
      from = new Date(now.getFullYear(), month - 1, day);
      if (now < from) from = new Date(now.getFullYear() - 1, month - 1, day);
    } else if (dto.period === 'quarter') {
      from = new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3, 1);
    } else {
      from = new Date(dto.from_date || now);
      to = new Date(dto.to_date || now);
    }

    const salesResult = await this.prisma.salesInvoice.aggregate({
      where: {
        tenantId: dto.tenant_id,
        createdAt: { gte: from, lte: to },
      },
      _sum: { grandTotal: true, vatTotal: true },
      _count: { id: true },
    });

    const cogsResult = await this.prisma.salesInvoiceItem.aggregate({
      where: {
        invoice: {
          tenantId: dto.tenant_id,
          createdAt: { gte: from, lte: to },
        },
      },
      _sum: { costPrice: true },
    });

    // Expenses
    const expensesResult = await this.prisma.expense.aggregate({
      where: {
        tenantId: dto.tenant_id,
        date: { gte: from, lte: to },
      },
      _sum: { amount: true },
      _count: { id: true },
    });

    // Input VAT from GRN
    const inputVat = await this.vatService.getInputVatFromGrn(
      dto.tenant_id,
      from,
      to,
    );

    // Advance payments
    const advanceTax = await this.incomeTaxService.getAdvanceTaxPayments(
      dto.tenant_id,
      settings?.taxYearStart || '04-01',
    );

    // Supporting documents count
    const invoiceCount = salesResult._count.id;
    const grnCount = await this.prisma.goodsReceivedNote.count({
      where: {
        tenantId: dto.tenant_id,
        receivedDate: { gte: from, lte: to },
      },
    });
    const expenseCount = expensesResult._count.id;

    const totalSales = salesResult._sum.grandTotal || 0;
    const totalCogs = cogsResult._sum.costPrice || 0;
    const totalExpenses = expensesResult._sum.amount || 0;
    const taxableIncome = totalSales - totalCogs - totalExpenses;
    const brackets = (settings?.progressiveBrackets as any[]) || [];
    const incomeTax = this.incomeTaxService.calcProgressiveTax(taxableIncome, brackets);
    const bracketBreakdown = this.getBracketBreakdown(taxableIncome, brackets);

    const reportData = {
      reportPeriod: {
        from: from.toISOString().split('T')[0],
        to: to.toISOString().split('T')[0],
      },
      salesSummary: {
        totalSales,
        totalInvoices: invoiceCount,
        totalVatCollected: salesResult._sum.vatTotal || 0,
      },
      costSummary: { totalCogs },
      expensesSummary: {
        totalExpenses,
        expenseCount,
      },
      advanceTaxPayments: {
        total: advanceTax.total,
        balanceDue: incomeTax - advanceTax.total,
        payments: advanceTax.payments,
      },
      supportingDocuments: {
        invoices: invoiceCount,
        grns: grnCount,
        expenses: expenseCount,
      },
      taxSummary: { taxableIncome, incomeTax, bracketBreakdown },
      vatSummary: {
        outputVat: salesResult._sum.vatTotal || 0,
        inputVat,
        netVatPayable: (salesResult._sum.vatTotal || 0) - inputVat,
      },
    };

    const format = dto.format || 'pdf';

    if (format === 'excel') {
      const buffer = await this.reportService.generateExcel(reportData);
      res['set']({
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="tax-report-${dto.tenant_id}.xlsx"`,
        'Content-Length': buffer.length,
      });
      res['end'](buffer);
    } else {
      const buffer = await this.reportService.generatePdf(reportData);
      res['set']({
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="tax-report-${dto.tenant_id}.pdf"`,
        'Content-Length': buffer.length,
      });
      res['end'](buffer);
    }
  }

  private getBracketBreakdown(income: number, brackets: any[]) {
    const breakdown: {
      rate: string;
      taxableAmount: number;
      tax: number;
    }[] = [];
    let remaining = income;

    for (const bracket of brackets) {
      if (remaining <= 0) break;
      const taxable = Math.min(remaining, bracket.limit);
      const tax = taxable * bracket.rate;
      breakdown.push({
        rate: `${(bracket.rate * 100).toFixed(0)}%`,
        taxableAmount: taxable,
        tax,
      });
      remaining -= taxable;
    }

    return breakdown;
  }
}