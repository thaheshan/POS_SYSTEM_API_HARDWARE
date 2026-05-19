import {
  Injectable,
  Inject,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import type { CacheClient } from 'src/cache/cache-client.interface';
import {
  ReportResponseDto,
  PaymentBreakdownDto,
  CategoryRankingDto,
  StaffPerformanceDto,
  InventoryAlertDto,
} from '../dtos/report-response.dto';
import { EndOfDayReportRequestDto } from '../dtos/end-of-day.dto';

@Injectable()
export class EndOfDayService {
  private readonly logger = new Logger(EndOfDayService.name);
  private readonly reportCacheTtlSeconds = 1800; // 30 minutes

  constructor(
    private readonly prisma: PrismaService,
    @Inject('REDIS_CLIENT') private readonly redis: CacheClient,
  ) {}

  async generateEndOfDayReport(
    tenantId: string,
    dto: EndOfDayReportRequestDto,
  ): Promise<ReportResponseDto> {
    const { date, branch_id, operating_expenses = 0 } = dto;

    // Validate date is not in future
    const reportDate = new Date(date);
    reportDate.setHours(0, 0, 0, 0);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (reportDate > today) {
      throw new BadRequestException('Report date cannot be in the future');
    }

    // IDEMPOTENCY: Check cache first (fast)
    const cacheKey = this.getCacheKey(tenantId, date, branch_id);
    const cached = await this.redis.get(cacheKey);
    if (cached) {
      return JSON.parse(cached);
    }

    // IDEMPOTENCY: Check database for existing report (before expensive calculation)
    // If report already exists (from previous request), return it directly
    const existingReport = await this.prisma.reportsGenerated.findUnique({
      where: {
        unique_report_per_day: {
          tenantId,
          branchId: branch_id,
          reportDate,
        },
      },
    });

    if (existingReport) {
      const response = this.mapReportToDto(existingReport);
      // Refresh cache
      await this.redis.set(
        cacheKey,
        JSON.stringify(response),
        'EX',
        this.reportCacheTtlSeconds,
      );
      return response;
    }

    try {
      // Calculate all report sections
      const [
        kpis,
        paymentBreakdown,
        profit,
        vat,
        categoryRankings,
        staffPerformance,
        inventoryAlerts,
      ] = await Promise.all([
        this.calculateRevenue(tenantId, branch_id, reportDate),
        this.calculatePaymentBreakdown(tenantId, branch_id, reportDate),
        this.calculateProfit(
          tenantId,
          branch_id,
          reportDate,
          operating_expenses,
        ),
        this.calculateVAT(tenantId, branch_id, reportDate),
        this.calculateCategoryRankings(tenantId, branch_id, reportDate),
        this.calculateStaffPerformance(tenantId, branch_id, reportDate),
        this.getInventoryAlerts(tenantId, branch_id),
      ]);

      // Build response
      const response: ReportResponseDto = {
        id: '',
        tenant_id: tenantId,
        branch_id,
        report_date: date,
        total_revenue: kpis.totalRevenue,
        total_transactions: kpis.totalTransactions,
        average_bill: kpis.averageBill,
        largest_transaction: kpis.largestTransaction,
        smallest_transaction: kpis.smallestTransaction,
        payment_breakdown: paymentBreakdown,
        cogs: profit.cogs,
        gross_profit: profit.grossProfit,
        operating_expenses,
        net_profit: profit.netProfit,
        vat_collected: vat.collected,
        vat_paid: vat.paid,
        net_vat: vat.net,
        category_rankings: categoryRankings,
        staff_performance: staffPerformance,
        low_stock_items: inventoryAlerts.low_stock,
        out_of_stock_items: inventoryAlerts.out_of_stock,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      // IDEMPOTENCY: Create (don't update) - ensures single authoritative version
      // If another process created it between our check and this create, let it fail and retry
      const stored = await this.prisma.reportsGenerated.create({
        data: {
          tenantId,
          branchId: branch_id,
          reportDate,
          totalRevenue: this.toDecimal(response.total_revenue),
          totalTransactions: response.total_transactions,
          averageBill: this.toDecimal(response.average_bill),
          largestTransaction: this.toDecimal(response.largest_transaction),
          smallestTransaction: this.toDecimal(response.smallest_transaction),
          cashAmount: this.toDecimal(paymentBreakdown.cash),
          cardAmount: this.toDecimal(paymentBreakdown.card),
          creditAmount: this.toDecimal(paymentBreakdown.credit),
          paymentPercentages: paymentBreakdown.percentages,
          cogs: this.toDecimal(profit.cogs),
          grossProfit: this.toDecimal(profit.grossProfit),
          operatingExpenses: this.toDecimal(operating_expenses),
          netProfit: this.toDecimal(profit.netProfit),
          vatCollected: this.toDecimal(vat.collected),
          vatPaid: this.toDecimal(vat.paid),
          netVat: this.toDecimal(vat.net),
          categoryRankings: JSON.parse(JSON.stringify(categoryRankings)),
          staffPerformance: JSON.parse(JSON.stringify(staffPerformance)),
          lowStockItems: JSON.parse(JSON.stringify(inventoryAlerts.low_stock)),
          outOfStockItems: JSON.parse(
            JSON.stringify(inventoryAlerts.out_of_stock),
          ),
        },
      });

      response.id = stored.id;

      // Cache the response
      await this.redis.set(
        cacheKey,
        JSON.stringify(response),
        'EX',
        this.reportCacheTtlSeconds,
      );

      return response;
    } catch (error) {
      // If create fails due to unique constraint, fetch existing and return it
      if (error.code === 'P2002') {
        const existing = await this.prisma.reportsGenerated.findUnique({
          where: {
            unique_report_per_day: {
              tenantId,
              branchId: branch_id,
              reportDate,
            },
          },
        });
        if (existing) {
          const response = this.mapReportToDto(existing);
          await this.redis.set(
            cacheKey,
            JSON.stringify(response),
            'EX',
            this.reportCacheTtlSeconds,
          );
          return response;
        }
      }
      this.logger.error(`Failed to generate end-of-day report: ${error}`);
      throw error;
    }
  }

  private async calculateRevenue(
    tenantId: string,
    branchId: string,
    reportDate: Date,
  ) {
    const nextDay = new Date(reportDate);
    nextDay.setDate(nextDay.getDate() + 1);

    const invoices = await this.prisma.salesInvoice.findMany({
      where: {
        tenantId,
        branchId,
        invoiceDate: {
          gte: reportDate,
          lt: nextDay,
        },
        status: { not: 'cancelled' },
      },
      select: {
        totalAmount: true,
      },
    });

    const totalRevenue = invoices.reduce(
      (sum, inv) => sum + Number(inv.totalAmount),
      0,
    );
    const totalTransactions = invoices.length;
    const averageBill =
      totalTransactions > 0 ? totalRevenue / totalTransactions : 0;

    const amounts = invoices
      .map((inv) => Number(inv.totalAmount))
      .sort((a, b) => a - b);
    const largestTransaction = amounts[amounts.length - 1] || 0;
    const smallestTransaction = amounts[0] || 0;

    return {
      totalRevenue,
      totalTransactions,
      averageBill,
      largestTransaction,
      smallestTransaction,
    };
  }

  private async calculatePaymentBreakdown(
    tenantId: string,
    branchId: string,
    reportDate: Date,
  ): Promise<PaymentBreakdownDto> {
    const nextDay = new Date(reportDate);
    nextDay.setDate(nextDay.getDate() + 1);

    const invoices = await this.prisma.salesInvoice.findMany({
      where: {
        tenantId,
        branchId,
        invoiceDate: {
          gte: reportDate,
          lt: nextDay,
        },
        status: { not: 'cancelled' },
      },
      select: {
        saleType: true,
        totalAmount: true,
      },
    });

    const breakdown = {
      cash: 0,
      card: 0,
      credit: 0,
    };

    invoices.forEach((inv) => {
      const amount = Number(inv.totalAmount);
      if (inv.saleType === 'cash') breakdown.cash += amount;
      else if (inv.saleType === 'card') breakdown.card += amount;
      else if (inv.saleType === 'credit') breakdown.credit += amount;
      // 'mixed' gets split proportionally if needed, or can go to cash
    });

    const total = breakdown.cash + breakdown.card + breakdown.credit;
    const percentages = {
      cash: total > 0 ? (breakdown.cash / total) * 100 : 0,
      card: total > 0 ? (breakdown.card / total) * 100 : 0,
      credit: total > 0 ? (breakdown.credit / total) * 100 : 0,
    };

    return {
      ...breakdown,
      percentages,
    };
  }

  private async calculateProfit(
    tenantId: string,
    branchId: string,
    reportDate: Date,
    operatingExpenses: number,
  ) {
    const nextDay = new Date(reportDate);
    nextDay.setDate(nextDay.getDate() + 1);

    // Get all invoice items for the day
    const invoiceItems = await this.prisma.salesInvoiceItem.findMany({
      where: {
        salesInvoice: {
          tenantId,
          branchId,
          invoiceDate: {
            gte: reportDate,
            lt: nextDay,
          },
          status: { not: 'cancelled' },
        },
      },
      select: {
        costPrice: true,
        lineTotal: true,
        quantity: true,
      },
    });

    // COGS = sum(cost_price * quantity)
    const cogs = invoiceItems.reduce((sum, item) => {
      const cost = Number(item.costPrice || 0);
      const qty = Number(item.quantity || 0);
      return sum + cost * qty;
    }, 0);

    // Get total revenue for gross profit
    const invoices = await this.prisma.salesInvoice.aggregate({
      where: {
        tenantId,
        branchId,
        invoiceDate: {
          gte: reportDate,
          lt: nextDay,
        },
        status: { not: 'cancelled' },
      },
      _sum: {
        totalAmount: true,
      },
    });

    const totalRevenue = Number(invoices._sum.totalAmount || 0);
    const grossProfit = totalRevenue - cogs;
    const netProfit = grossProfit - operatingExpenses;

    return {
      cogs,
      grossProfit,
      netProfit,
    };
  }

  private async calculateVAT(
    tenantId: string,
    branchId: string,
    reportDate: Date,
  ) {
    const nextDay = new Date(reportDate);
    nextDay.setDate(nextDay.getDate() + 1);

    // VAT collected from sales
    const saleVAT = await this.prisma.salesInvoiceItem.aggregate({
      where: {
        salesInvoice: {
          tenantId,
          branchId,
          invoiceDate: {
            gte: reportDate,
            lt: nextDay,
          },
          status: { not: 'cancelled' },
        },
      },
      _sum: {
        taxAmount: true,
      },
    });

    const vatCollected = Number(saleVAT._sum.taxAmount || 0);
    // VAT paid would come from GRN purchases - not implemented yet
    const vatPaid = 0;
    const netVat = vatCollected - vatPaid;

    return {
      collected: vatCollected,
      paid: vatPaid,
      net: netVat,
    };
  }

  private async calculateCategoryRankings(
    tenantId: string,
    branchId: string,
    reportDate: Date,
  ): Promise<CategoryRankingDto[]> {
    const nextDay = new Date(reportDate);
    nextDay.setDate(nextDay.getDate() + 1);

    // Get today's category sales
    const todayCategories = await this.prisma.salesInvoiceItem.groupBy({
      by: ['productId'],
      where: {
        salesInvoice: {
          tenantId,
          branchId,
          invoiceDate: {
            gte: reportDate,
            lt: nextDay,
          },
          status: { not: 'cancelled' },
        },
      },
      _sum: {
        lineTotal: true,
      },
    });

    if (todayCategories.length === 0) {
      return [];
    }

    // Get products with categories
    const products = await this.prisma.product.findMany({
      where: {
        id: {
          in: todayCategories.map((tc) => tc.productId),
        },
      },
      include: {
        category: true,
      },
    });

    // Group by category and calculate totals
    const categoryMap = new Map<
      string,
      { categoryId: string; name: string; revenue: number; products: string[] }
    >();

    for (const item of todayCategories) {
      const product = products.find((p) => p.id === item.productId);
      if (!product?.category) continue;

      const revenue = Number(item._sum.lineTotal || 0);
      const existing = categoryMap.get(product.categoryId) || {
        categoryId: product.categoryId,
        name: product.category.categoryName,
        revenue: 0,
        products: [],
      };

      existing.revenue += revenue;
      existing.products.push(product.name);
      categoryMap.set(product.categoryId, existing);
    }

    // Calculate total revenue for percentages
    const totalRevenue = Array.from(categoryMap.values()).reduce(
      (sum, cat) => sum + cat.revenue,
      0,
    );

    // Get yesterday's report for vs_yesterday comparison
    const yesterdayDate = new Date(reportDate);
    yesterdayDate.setDate(yesterdayDate.getDate() - 1);

    let yesterdayCategories: any[] = [];
    try {
      const yesterdayReport = await this.prisma.reportsGenerated.findUnique({
        where: {
          unique_report_per_day: {
            tenantId,
            branchId,
            reportDate: yesterdayDate,
          },
        },
      });

      if (yesterdayReport?.categoryRankings) {
        yesterdayCategories = yesterdayReport.categoryRankings as any[];
      }
    } catch (error) {
      // No yesterday report, continue with 0% comparison
    }

    // Build rankings
    const rankings: CategoryRankingDto[] = Array.from(categoryMap.values())
      .map((cat) => {
        const yesterday = yesterdayCategories.find(
          (yc: any) => yc.category_id === cat.categoryId,
        );
        const yesterdayRevenue = yesterday?.revenue || 0;
        const vs_yesterday_pct =
          yesterdayRevenue > 0
            ? ((cat.revenue - yesterdayRevenue) / yesterdayRevenue) * 100
            : 0;

        return {
          category_id: cat.categoryId,
          name: cat.name,
          revenue: cat.revenue,
          revenue_pct:
            totalRevenue > 0 ? (cat.revenue / totalRevenue) * 100 : 0,
          profit_margin: 0, // TODO: Calculate based on COGS per category
          vs_yesterday_pct,
          top_product: cat.products[0] || '',
        };
      })
      .sort((a, b) => b.revenue - a.revenue);

    return rankings;
  }

  private async calculateStaffPerformance(
    tenantId: string,
    branchId: string,
    reportDate: Date,
  ): Promise<StaffPerformanceDto[]> {
    const nextDay = new Date(reportDate);
    nextDay.setDate(nextDay.getDate() + 1);

    const staffData = await this.prisma.salesInvoice.groupBy({
      by: ['cashierId'],
      where: {
        tenantId,
        branchId,
        invoiceDate: {
          gte: reportDate,
          lt: nextDay,
        },
        status: { not: 'cancelled' },
      },
      _count: {
        id: true,
      },
      _sum: {
        totalAmount: true,
      },
    });

    if (staffData.length === 0 || !staffData[0].cashierId) {
      return [];
    }

    // Get user details
    const userIds = staffData
      .filter((s) => s.cashierId)
      .map((s) => s.cashierId as string);
    const users = await this.prisma.user.findMany({
      where: {
        user_id: {
          in: userIds,
        },
      },
      select: {
        user_id: true,
        first_name: true,
        last_name: true,
      },
    });

    return staffData
      .filter((s) => s.cashierId)
      .map((s) => {
        const user = users.find((u) => u.user_id === s.cashierId);
        const name = user
          ? `${user.first_name} ${user.last_name}`.trim()
          : 'Unknown';

        return {
          cashier_id: s.cashierId as string,
          name,
          transactions: s._count.id,
          revenue: Number(s._sum.totalAmount || 0),
        };
      })
      .sort((a, b) => b.revenue - a.revenue);
  }

  private async getInventoryAlerts(
    tenantId: string,
    branchId: string,
  ): Promise<{
    low_stock: InventoryAlertDto[];
    out_of_stock: InventoryAlertDto[];
  }> {
    const stocks = await this.prisma.stock.findMany({
      where: {
        product: { tenantId },
        branchId,
      },
      include: {
        product: true,
      },
    });

    const lowStock: InventoryAlertDto[] = [];
    const outOfStock: InventoryAlertDto[] = [];

    stocks.forEach((stock) => {
      const qty = Number(stock.quantity);
      const minLevel = Number(stock.product.minimumStockLevel || 0);

      if (qty <= 0) {
        outOfStock.push({
          product_id: stock.productId,
          name: stock.product.name,
          status: 'out_of_stock',
        });
      } else if (qty <= minLevel) {
        lowStock.push({
          product_id: stock.productId,
          name: stock.product.name,
          quantity: qty,
          status: 'low_stock',
        });
      }
    });

    return { low_stock: lowStock, out_of_stock: outOfStock };
  }

  private getCacheKey(
    tenantId: string,
    date: string,
    branchId: string,
  ): string {
    return `daily_report:${tenantId}:${date}:${branchId}`;
  }

  private toDecimal(value: number): any {
    // Prisma Decimal will handle conversion
    return value;
  }

  /**
   * Map database report record to DTO
   * Used for idempotency: when returning cached/existing reports
   */
  private mapReportToDto(report: any): ReportResponseDto {
    return {
      id: report.id,
      tenant_id: report.tenantId,
      branch_id: report.branchId,
      report_date: report.reportDate.toISOString().split('T')[0],
      total_revenue: Number(report.totalRevenue),
      total_transactions: report.totalTransactions,
      average_bill: Number(report.averageBill),
      largest_transaction: Number(report.largestTransaction),
      smallest_transaction: Number(report.smallestTransaction),
      payment_breakdown: {
        cash: Number(report.cashAmount),
        card: Number(report.cardAmount),
        credit: Number(report.creditAmount),
        percentages: report.paymentPercentages,
      },
      cogs: Number(report.cogs),
      gross_profit: Number(report.grossProfit),
      operating_expenses: Number(report.operatingExpenses),
      net_profit: Number(report.netProfit),
      vat_collected: Number(report.vatCollected),
      vat_paid: Number(report.vatPaid),
      net_vat: Number(report.netVat),
      category_rankings: report.categoryRankings,
      staff_performance: report.staffPerformance,
      low_stock_items: report.lowStockItems,
      out_of_stock_items: report.outOfStockItems,
      created_at: report.createdAt.toISOString(),
      updated_at: report.updatedAt.toISOString(),
    };
  }
}
