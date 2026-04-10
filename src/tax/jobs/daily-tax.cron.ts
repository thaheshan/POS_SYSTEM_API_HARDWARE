import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '../../prisma/prisma.service';
import { IncomeTaxService } from '../services/income-tax.service';

@Injectable()
export class DailyTaxCron {
  private readonly logger = new Logger(DailyTaxCron.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly incomeTaxService: IncomeTaxService,
  ) {}

  @Cron('1 0 * * *')     //  Production — every day 00:01
// @Cron('* * * * *')  // Test — comment out
  async runDailyTaxSummary(): Promise<void> {
    this.logger.log('Running daily tax summary...');

    try {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const dateOnly = new Date(yesterday.toDateString());

      const from = new Date(dateOnly);
      from.setHours(0, 0, 0, 0);
      const to = new Date(dateOnly);
      to.setHours(23, 59, 59, 999);

      // Tenants list
      const tenants = await this.prisma.shopSettings.findMany({
        select: { tenantId: true, progressiveBrackets: true, taxYearStart: true },
      });

      for (const tenant of tenants) {
        await this.processTenantDailyTax(
          tenant.tenantId,
          dateOnly,
          from,
          to,
          tenant.progressiveBrackets as any[],
          tenant.taxYearStart,
        );
      }

      this.logger.log('Daily tax summary completed');
    } catch (error) {
      this.logger.error('Daily tax summary failed', error);
    }
  }

  private async processTenantDailyTax(
    tenantId: string,
    date: Date,
    from: Date,
    to: Date,
    brackets: any[],
    taxYearStart: string,
  ): Promise<void> {
    // Output VAT
    const outputVatResult = await this.prisma.salesInvoiceItem.aggregate({
      where: {
        taxCategory: 'standard_vat',
        invoice: {
          tenantId,
          createdAt: { gte: from, lte: to },
        },
      },
      _sum: { lineTax: true },
    });
    const outputVat = outputVatResult._sum.lineTax || 0;

    // Revenue
    const revenueResult = await this.prisma.salesInvoice.aggregate({
      where: {
        tenantId,
        createdAt: { gte: from, lte: to },
      },
      _sum: { grandTotal: true },
    });
    const revenue = revenueResult._sum.grandTotal || 0;

    // COGS
    const cogsResult = await this.prisma.salesInvoiceItem.aggregate({
      where: {
        invoice: {
          tenantId,
          createdAt: { gte: from, lte: to },
        },
      },
      _sum: { costPrice: true },
    });
    const cogs = cogsResult._sum.costPrice || 0;

    const taxableProfit = revenue - cogs;
    const netVatPayable = outputVat; // Input VAT later GRN module

    // YTD income tax
    const ytdIncome = await this.incomeTaxService.getYtdIncome(tenantId, taxYearStart);
    const totalYtdIncome = ytdIncome + taxableProfit;
    const incomeTax = this.incomeTaxService.calcProgressiveTax(totalYtdIncome, brackets);

    // Upsert daily tracking
    await this.prisma.dailyTaxTracking.upsert({
      where: {
        date_tenantId: { date, tenantId },
      },
      update: {
        taxableProfit,
        outputVat,
        inputVat: 0,
        netVatPayable,
        incomeTax,
      },
      create: {
        date,
        tenantId,
        taxableProfit,
        outputVat,
        inputVat: 0,
        netVatPayable,
        incomeTax,
      },
    });

    this.logger.log(`Tax summary for ${tenantId} on ${date.toDateString()} done`);
  }
}