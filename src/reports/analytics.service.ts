import { HttpException, Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { GetWeeklyReportDto } from './dto/get-weekly-report.dto';
import {
  CategoryPerformance,
  CustomerInsight,
  DailyRevenueMetric,
  MonthlyAnalyticsReport,
  ReorderSuggestion,
  StaffPerformance,
  TaxUpdate,
  WeeklyAnalyticsReport,
} from './interfaces/analytics-report.interface';
import { ReportGenerationException } from './exceptions/Analatics_report_generatio.exception';
import { Logger } from '@nestjs/common';
import { GetMonthlyReportDto } from './dto/get-monthly-report.dto';
import { Prisma } from '@prisma/client';

@Injectable()
export class AnalyticsService {
  private readonly logger = new Logger(AnalyticsService.name);
  constructor(private readonly prisma: PrismaService) {}

  public async generateWeeklyReport(
    tenantId: string,
    query: GetWeeklyReportDto,
  ): Promise<WeeklyAnalyticsReport> {
    this.logger.log(
      `Initiating weekly report generation for tenant: ${tenantId}, weekStart: ${query.week_start}`,
    );
    try {
      const { week_start } = query;
      const startDate = new Date(`${week_start}T00:00:00.000Z`);

      const endDate = new Date(startDate);
      endDate.setUTCDate(startDate.getUTCDate() + 7);

      const cachedReport = await this.prisma.generatedReport.findFirst({
        where: {
          tenantId,
          reportType: 'WEEKLY',
          startDate: startDate,
        },
      });

      if (cachedReport) {
        this.logger.log(
          `Cache hit. Returning cached weekly report for tenant: ${tenantId}`,
        );
        return cachedReport.data as unknown as WeeklyAnalyticsReport;
      }
      this.logger.debug(
        `Cache miss. Computing aggregates between ${startDate.toISOString()} and ${endDate.toISOString()}`,
      );

      const [
        reorderSuggestions,
        dailyRevenue,
        categoryPerformance,
        customerInsights,
        staffPerformance,
        taxUpdate,
      ] = await Promise.all([
        this.getReorderSuggestions(tenantId),
        this.getDailyRevenue(tenantId, startDate, endDate),
        this.getCategoryPerformance(tenantId, startDate, endDate, 'WEEKLY'),
        this.getCustomerInsights(tenantId, startDate, endDate),
        this.getStaffPerformance(tenantId, startDate, endDate),
        this.getTaxUpdate(tenantId, startDate, endDate),
      ]);

      const report: WeeklyAnalyticsReport = {
        tenantId,
        weekStart: week_start,
        dailyRevenue,
        categoryPerformance,
        reorderSuggestions,
        customerInsights,
        taxUpdate,
        staffPerformance,
      };

      await this.prisma.generatedReport.create({
        data: {
          tenantId,
          reportType: 'WEEKLY',
          startDate: startDate,
          endDate: endDate,
          data: report as unknown as Prisma.InputJsonValue,
        },
      });
      this.logger.log(
        `Successfully compiled and cached weekly report for tenant: ${tenantId}`,
      );
      return report;
    } catch (error: unknown) {
      this.logger.error('Error generating weekly analytics report', {
        tenantId,
        error,
      });

      if (error instanceof HttpException) {
        throw error;
      }
      throw new ReportGenerationException('generateWeeklyReport', error);
    }
  }

  public async generateMonthlyReport(
    tenantId: string,
    query: GetMonthlyReportDto,
  ): Promise<MonthlyAnalyticsReport> {
    this.logger.log(
      `Initiating monthly report generation for tenant: ${tenantId}, month: ${query.month}`,
    );

    try {
      const { month } = query;
      const [yearStr, monthStr] = month.split('-');

      const startDate = new Date(
        Date.UTC(Number(yearStr), Number(monthStr) - 1, 1),
      );
      const endDate = new Date(Date.UTC(Number(yearStr), Number(monthStr), 1));

      const cachedReport = await this.prisma.generatedReport.findFirst({
        where: {
          tenantId,
          reportType: 'MONTHLY',
          startDate: startDate,
        },
      });

      if (cachedReport) {
        this.logger.log(
          `Cache hit. Returning cached monthly report for tenant: ${tenantId}`,
        );
        return cachedReport.data as unknown as MonthlyAnalyticsReport;
      }
      this.logger.debug(`Cache miss. Computing monthly aggregates...`);

      const [
        reorderSuggestions,
        dailyRevenue,
        categoryPerformance,
        customerInsights,
        staffPerformance,
        taxUpdate,
      ] = await Promise.all([
        this.getReorderSuggestions(tenantId),
        this.getDailyRevenue(tenantId, startDate, endDate),
        this.getCategoryPerformance(tenantId, startDate, endDate, 'MONTHLY'),
        this.getCustomerInsights(tenantId, startDate, endDate),
        this.getStaffPerformance(tenantId, startDate, endDate),
        this.getTaxUpdate(tenantId, startDate, endDate),
      ]);

      const report: MonthlyAnalyticsReport = {
        tenantId,
        month,
        dailyRevenue,
        categoryPerformance,
        customerInsights,
        staffPerformance,
        taxUpdate,
        reorderSuggestions,
      };

      await this.prisma.generatedReport.create({
        data: {
          tenantId,
          reportType: 'MONTHLY',
          startDate: startDate,
          endDate: endDate,
          data: report as unknown as Prisma.InputJsonValue,
        },
      });

      this.logger.log(
        `Successfully compiled and cached monthly report for tenant: ${tenantId}`,
      );

      return report;
    } catch (error: unknown) {
      const stackTrace = error instanceof Error ? error.stack : undefined;
      this.logger.error(
        `Monthly report generation failed for tenant: ${tenantId}`,
        stackTrace,
      );
      throw new ReportGenerationException('Monthly Report Aggregation', error);
    }
  }

  public async getLiveReorderList(
    tenantId: string,
    // response: Response,
  ): Promise<ReorderSuggestion[]> {
    this.logger.log(`Fetching live reorder list for tenant: ${tenantId}`);
    try {
      return await this.getReorderSuggestions(tenantId);
    } catch (error: unknown) {
      this.logger.error(
        `Failed to fetch live reorder list for tenant: ${tenantId}`,
      );
      throw new ReportGenerationException('Live Reorder List', error);
    }
  }

  private async getDailyRevenue(
    tenantId: string,
    startDate: Date,
    endDate: Date,
  ): Promise<DailyRevenueMetric[]> {
    this.logger.debug(
      `Executing database query for daily revenue (tenant: ${tenantId})`,
    );

    const invoices = await this.prisma.salesInvoice.findMany({
      where: {
        tenantId,
        createdAt: {
          gte: startDate,
          lt: endDate,
        },
        status: 'COMPLETED',
      },
      select: {
        createdAt: true,
        totalAmount: true,
      },
    });

    const revenueMap = new Map<string, number>();
    const diffTime = Math.abs(endDate.getTime() - startDate.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    const toUtcDateString = (date: Date) => {
      const pad = (n: number) => n.toString().padStart(2, '0');
      return `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}-${pad(date.getUTCDate())}`;
    };

    for (let i = 0; i < diffDays; i++) {
      const currentDate = new Date(startDate);
      currentDate.setUTCDate(startDate.getUTCDate() + i);
      const dateString = toUtcDateString(currentDate);
      revenueMap.set(dateString, 0);
    }

    for (const invoice of invoices) {
      const dateString = toUtcDateString(invoice.createdAt);
      const currentSum = revenueMap.get(dateString) || 0;
      revenueMap.set(dateString, currentSum + invoice.totalAmount.toNumber());
    }

    let maxRevenue = -1;
    let minRevenue = Infinity;

    revenueMap.forEach((revenue) => {
      if (revenue > maxRevenue) maxRevenue = revenue;
      if (revenue < minRevenue && revenue >= 0) minRevenue = revenue;
    });

    const dailyMetrics: DailyRevenueMetric[] = Array.from(
      revenueMap.entries(),
    ).map(([date, revenue]) => ({
      date,
      revenue: Number(revenue.toFixed(2)),
      isBestDay: revenue === maxRevenue && revenue > 0,
      isWorstDay: revenue === minRevenue && maxRevenue > 0,
    }));

    return dailyMetrics;
  }

  private async getReorderSuggestions(
    tenantId: string,
  ): Promise<ReorderSuggestion[]> {
    this.logger.debug(
      `Executing database query for reorder suggestions (tenant: ${tenantId})`,
    );

    const inventory = await this.prisma.stock.findMany({
      where: { tenantId },
      include: {
        product: {
          include: {
            supplierProducts: {
              where: { isPreferred: true },
              include: { supplier: true },
              take: 1,
            },
          },
        },
      },
    });

    const suggestions: ReorderSuggestion[] = [];

    for (const item of inventory) {
      const availableQty = item.availableQuantity
        ? item.availableQuantity.toNumber()
        : 0;
      const minStockLevel = item.product.minimumStockLevel
        ? item.product.minimumStockLevel.toNumber()
        : 0;

      if (availableQty <= minStockLevel) {
        const urgencyRatio =
          minStockLevel > 0 ? availableQty / minStockLevel : 0;

        const preferredSupplier = item.product.supplierProducts[0];
        const supplierPrice = preferredSupplier?.supplierPrice
          ? preferredSupplier.supplierPrice.toNumber()
          : 0;
        const reorderQty = item.product.reorderQuantity
          ? item.product.reorderQuantity.toNumber()
          : 0;
        const totalOrderValue = supplierPrice * reorderQty;

        suggestions.push({
          productId: item.productId,
          productName: item.product.name,
          availableQuantity: availableQty,
          minimumStockLevel: minStockLevel,
          urgencyRatio: Number(urgencyRatio.toFixed(2)),
          supplierName: preferredSupplier?.supplier?.name ?? null,
          totalOrderValue: Number(totalOrderValue.toFixed(2)),
        });
      }
    }

    this.logger.debug(
      `Found ${suggestions.length} items requiring reorder (tenant: ${tenantId})`,
    );
    return suggestions.sort((a, b) => a.urgencyRatio - b.urgencyRatio);
  }

  private async getCategoryPerformance(
    tenantId: string,
    startDate: Date,
    endDate: Date,
    reportType: 'WEEKLY' | 'MONTHLY',
  ): Promise<CategoryPerformance[]> {
    this.logger.debug(
      `Executing category performance aggregation (tenant: ${tenantId})`,
    );

    const currentWeekItems = await this.prisma.salesInvoiceItem.findMany({
      where: {
        invoice: {
          tenantId,
          createdAt: { gte: startDate, lt: endDate },
          status: 'COMPLETED',
        },
      },
      include: {
        product: {
          include: { category: true },
        },
      },
    });

    const categoryMap = new Map<
      string,
      { name: string; revenue: number; profit: number; units: number }
    >();

    for (const item of currentWeekItems) {
      const categoryId = item.product.categoryId;
      const categoryName = item.product.category.name;

      const current = categoryMap.get(categoryId) || {
        name: categoryName,
        revenue: 0,
        profit: 0,
        units: 0,
      };

      current.revenue += item.lineTotal.toNumber();
      current.profit += item.profit ? item.profit.toNumber() : 0;
      current.units += item.quantity.toNumber();

      categoryMap.set(categoryId, current);
    }

    const previousStartDate = new Date(startDate);
    if (reportType === 'WEEKLY') {
      previousStartDate.setUTCDate(startDate.getUTCDate() - 7);
    } else {
      previousStartDate.setUTCMonth(startDate.getUTCMonth() - 1);
    }

    const previousReport = await this.prisma.generatedReport.findFirst({
      where: {
        tenantId,
        reportType,
        startDate: previousStartDate,
      },
    });

    const previousData = previousReport?.data as
      | { categoryPerformance?: CategoryPerformance[] }
      | undefined;
    const previousCategories = previousData?.categoryPerformance || [];

    const performanceMetrics: CategoryPerformance[] = [];

    for (const [categoryId, data] of categoryMap.entries()) {
      const previous = previousCategories.find(
        (c) => c.categoryId === categoryId,
      );
      const previousRevenue = previous ? previous.revenue : 0;

      let percentageChange = 0;
      if (previousRevenue > 0) {
        percentageChange =
          ((data.revenue - previousRevenue) / previousRevenue) * 100;
      } else if (data.revenue > 0 && previousRevenue === 0) {
        percentageChange = 100;
      }

      const profitMargin =
        data.revenue > 0 ? (data.profit / data.revenue) * 100 : 0;

      performanceMetrics.push({
        categoryId,
        categoryName: data.name,
        revenue: Number(data.revenue.toFixed(2)),
        profitMargin: Number(profitMargin.toFixed(2)),
        unitsSold: Number(data.units.toFixed(2)),
        percentageChange: Number(percentageChange.toFixed(2)),
        isUnderperforming: percentageChange < -5,
      });
    }

    return performanceMetrics.sort((a, b) => b.revenue - a.revenue);
  }
  private async getCustomerInsights(
    tenantId: string,
    startDate: Date,
    endDate: Date,
  ): Promise<CustomerInsight[]> {
    this.logger.debug(
      `Executing database query for customer insights (tenant: ${tenantId})`,
    );

    const topCustomerStats = await this.prisma.salesInvoice.groupBy({
      by: ['customerId'],
      where: {
        tenantId,
        createdAt: { gte: startDate, lt: endDate },
        status: 'COMPLETED',
        customerId: { not: null },
      },
      _sum: { totalAmount: true },
      _count: { id: true },
      orderBy: {
        _sum: { totalAmount: 'desc' },
      },
      take: 5,
    });

    if (topCustomerStats.length === 0) return [];

    const customerIds = topCustomerStats.map(
      (stat) => stat.customerId as string,
    );

    const customers = await this.prisma.customer.findMany({
      where: { id: { in: customerIds } },
      select: { id: true, name: true },
    });

    const insights: CustomerInsight[] = topCustomerStats.map((stat) => {
      const customerInfo = customers.find((c) => c.id === stat.customerId);

      return {
        customerId: stat.customerId as string,
        customerName: customerInfo?.name || 'Unknown Customer',
        totalSpent: stat._sum.totalAmount
          ? Number(stat._sum.totalAmount.toFixed(2))
          : 0,
        transactionCount: stat._count.id,
      };
    });

    return insights;
  }

  private async getStaffPerformance(
    tenantId: string,
    startDate: Date,
    endDate: Date,
  ): Promise<StaffPerformance[]> {
    this.logger.debug(
      `Executing database query for staff performance (tenant: ${tenantId})`,
    );

    const staffStats = await this.prisma.salesInvoice.groupBy({
      by: ['cashierId'],
      where: {
        tenantId,
        createdAt: { gte: startDate, lt: endDate },
        status: 'COMPLETED',
        cashierId: { not: null },
      },
      _sum: { totalAmount: true },
      _count: { id: true },
      orderBy: {
        _sum: { totalAmount: 'desc' },
      },
    });

    if (staffStats.length === 0) return [];

    const cashierIds = staffStats.map((stat) => stat.cashierId as string);

    const users = await this.prisma.user.findMany({
      where: { user_id: { in: cashierIds } },
      select: { user_id: true, first_name: true, last_name: true },
    });

    const leaderboard: StaffPerformance[] = staffStats.map((stat) => {
      const user = users.find((u) => u.user_id === stat.cashierId);
      const name = user
        ? `${user.first_name || ''} ${user.last_name || ''}`.trim()
        : 'Unknown Staff';

      const totalRevenue = stat._sum.totalAmount
        ? stat._sum.totalAmount.toNumber()
        : 0;
      const transactionCount = stat._count.id;

      const averageBill =
        transactionCount > 0 ? totalRevenue / transactionCount : 0;

      return {
        cashierId: stat.cashierId as string,
        cashierName: name || 'System/Admin',
        transactionCount,
        totalRevenue: Number(totalRevenue.toFixed(2)),
        averageBill: Number(averageBill.toFixed(2)),
      };
    });

    return leaderboard;
  }

  private async getTaxUpdate(
    tenantId: string,
    startDate: Date,
    endDate: Date,
  ): Promise<TaxUpdate> {
    this.logger.debug(
      `Executing database queries for tax updates (tenant: ${tenantId})`,
    );

    const weeklyAggregation = await this.prisma.salesInvoiceItem.aggregate({
      where: {
        invoice: {
          tenantId,
          createdAt: { gte: startDate, lt: endDate },
          status: 'COMPLETED',
        },
      },
      _sum: { profit: true },
    });

    const periodProfit = Number(weeklyAggregation._sum.profit ?? 0);

    const startOfYear = new Date(Date.UTC(startDate.getUTCFullYear(), 0, 1));

    const ytdAggregation = await this.prisma.salesInvoiceItem.aggregate({
      where: {
        invoice: {
          tenantId,
          createdAt: { gte: startOfYear, lt: endDate },
          status: 'COMPLETED',
        },
      },
      _sum: { profit: true },
    });

    const ytdIncome = Number(ytdAggregation._sum.profit ?? 0);

    const ESTIMATED_TAX_RATE = 0.15;
    const estimatedTaxLiability =
      ytdIncome > 0 ? ytdIncome * ESTIMATED_TAX_RATE : 0;

    const advanceTaxAggregation = await this.prisma.advanceTaxPayment.aggregate(
      {
        where: {
          tenantId,
          paymentDate: { gte: startOfYear, lt: endDate },
        },
        _sum: { amount: true },
      },
    );

    const advanceTaxPaid = Number(advanceTaxAggregation._sum.amount ?? 0);

    const projectedBalanceDue = Math.max(
      0,
      estimatedTaxLiability - advanceTaxPaid,
    );

    return {
      periodProfit: Number(periodProfit.toFixed(2)),
      ytdIncome: Number(ytdIncome.toFixed(2)),
      estimatedTaxLiability: Number(estimatedTaxLiability.toFixed(2)),
      advanceTaxPaid: Number(advanceTaxPaid.toFixed(2)),
      projectedBalanceDue: Number(projectedBalanceDue.toFixed(2)),
    };
  }
}
