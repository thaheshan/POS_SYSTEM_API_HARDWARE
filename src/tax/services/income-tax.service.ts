import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class IncomeTaxService {
  constructor(private readonly prisma: PrismaService) {}

  // Progressive tax calculation
  calcProgressiveTax(income: number, brackets: any[]): number {
    let tax = 0;
    let remaining = income;

    for (const bracket of brackets) {
      if (remaining <= 0) break;
      const taxable = Math.min(remaining, bracket.limit);
      tax += taxable * bracket.rate;
      remaining -= taxable;
    }

    return tax;
  }

  // YTD income
  async getYtdIncome(tenantId: string, taxYearStart: string): Promise<number> {
    const [month, day] = taxYearStart.split('-').map(Number);
    const now = new Date();

    // Tax year start date calculate
    let yearStart = new Date(now.getFullYear(), month - 1, day);
    if (now < yearStart) {
      yearStart = new Date(now.getFullYear() - 1, month - 1, day);
    }

    const result = await this.prisma.dailyTaxTracking.aggregate({
      where: {
        tenantId,
        date: { gte: yearStart },
      },
      _sum: { taxableProfit: true },
    });

    return result._sum.taxableProfit || 0;
  }

  // Current tax bracket
  getCurrentBracket(income: number, brackets: any[]): string {
    let remaining = income;
    let currentBracket = brackets[0];

    for (const bracket of brackets) {
      if (remaining <= 0) break;
      currentBracket = bracket;
      remaining -= bracket.limit;
    }

    return `${(currentBracket.rate * 100).toFixed(0)}%`;
  }

  // Expenses YTD
  async getYtdExpenses(tenantId: string, from: Date, to: Date): Promise<number> {
    const result = await this.prisma.expense.aggregate({
      where: {
        tenantId,
        date: { gte: from, lte: to },
      },
      _sum: { amount: true },
    });
    return result._sum.amount || 0;
  }

  // Advance tax payments
  async getAdvanceTaxPayments(tenantId: string, taxYearStart: string): Promise<{
    total: number;
    payments: any[];
  }> {
    const [month, day] = taxYearStart.split('-').map(Number);
    const now = new Date();
    let yearStart = new Date(now.getFullYear(), month - 1, day);
    if (now < yearStart) yearStart = new Date(now.getFullYear() - 1, month - 1, day);

    const payments = await this.prisma.advanceTaxPayment.findMany({
      where: {
        tenantId,
        paymentDate: { gte: yearStart },
      },
      orderBy: { paymentDate: 'asc' },
    });

    const total = payments.reduce((sum, p) => sum + p.amount, 0);
    return { total, payments };
  }
}