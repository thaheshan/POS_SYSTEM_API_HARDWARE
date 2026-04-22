import {
  Injectable,
  Inject,
  Logger,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import type { CacheClient } from 'src/cache/cache-client.interface';
import { OwnerDashboardResponseDto } from '../dtos/owner-dashboard.dto';

@Injectable()
export class OwnerDashboardService {
  private readonly logger = new Logger(OwnerDashboardService.name);
  private readonly cacheTtlSeconds = 300; // 5 minutes

  constructor(
    private readonly prisma: PrismaService,
    @Inject('REDIS_CLIENT') private readonly redis: CacheClient,
  ) {}

  async getOwnerDashboard(
    tenantId: string,
  ): Promise<OwnerDashboardResponseDto> {
    const cacheKey = `dashboard:owner:${tenantId}`;

    try {
      // Check cache first
      const cached = await this.redis.get(cacheKey);
      if (cached) {
        return JSON.parse(cached);
      }
    } catch (error) {
      this.logger.warn(`Cache get error: ${error.message}`);
    }

    // Fetch all metrics in parallel
    const [
      todayMetrics,
      yesterdayRevenue,
      lowStockCount,
      outOfStockCount,
      topProducts,
      categoryBreakdown,
      staffPerformance,
      ytdMetrics,
      paymentBreakdown,
    ] = await Promise.all([
      this.getTodayMetrics(tenantId),
      this.getYesterdayRevenue(tenantId),
      this.getLowStockCount(tenantId),
      this.getOutOfStockCount(tenantId),
      this.getTopProducts(tenantId),
      this.getCategoryBreakdown(tenantId),
      this.getStaffPerformance(tenantId),
      this.getYtdMetrics(tenantId),
      this.getPaymentBreakdown(tenantId),
    ]);

    const vsPct =
      yesterdayRevenue > 0
        ? ((todayMetrics.totalRevenue - yesterdayRevenue) / yesterdayRevenue) *
          100
        : 0;

    const response: OwnerDashboardResponseDto = {
      revenue_today: todayMetrics.totalRevenue,
      vs_yesterday_pct: Math.round(vsPct * 100) / 100,
      gross_profit_today: todayMetrics.grossProfit,
      vat_collected: todayMetrics.vatCollected,
      low_stock_count: lowStockCount,
      out_of_stock_count: outOfStockCount,
      total_stock_value: todayMetrics.totalStockValue,
      total_transactions_today: todayMetrics.totalTransactions,
      average_bill_today: todayMetrics.averageBill,
      top_products: topProducts,
      category_chart: categoryBreakdown,
      staff_performance: staffPerformance,
      ytd_tax_estimate: ytdMetrics.ytdTax,
      ytd_revenue: ytdMetrics.ytdRevenue,
      ytd_profit: ytdMetrics.ytdProfit,
      payment_breakdown: paymentBreakdown,
      cash_in_hand: paymentBreakdown.cash,
      pending_payments: todayMetrics.pendingPayments,
      average_margin_pct:
        todayMetrics.totalRevenue > 0
          ? (todayMetrics.grossProfit / todayMetrics.totalRevenue) * 100
          : 0,
      generated_at: new Date().toISOString(),
    };

    // Cache the response
    try {
      await this.redis.set(
        cacheKey,
        JSON.stringify(response),
        'EX',
        this.cacheTtlSeconds,
      );
    } catch (error) {
      this.logger.warn(`Cache set error: ${error.message}`);
    }

    return response;
  }

  private async getTodayMetrics(tenantId: string) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayStr = today.toISOString().split('T')[0];

    const [invoices, stock] = (await Promise.all([
      this.prisma.$queryRaw`
        SELECT 
          COUNT(*) as count,
          SUM(CAST(total_amount AS DECIMAL(12,2))) as revenue,
          SUM(CAST(tax_amount AS DECIMAL(12,2))) as vat,
          COUNT(CASE WHEN payment_status = 'unpaid' OR payment_status = 'partial' THEN 1 END) as pending_count
        FROM sales_invoices 
        WHERE tenant_id = ${tenantId} AND DATE(invoice_date) = DATE(${todayStr}::date)
      `,
      this.prisma.$queryRaw`
        SELECT SUM(CAST(s.quantity * COALESCE(p.purchase_price, 0) AS DECIMAL(12,2))) as total_value
        FROM stock s
        JOIN products p ON s.product_id = p.product_id
        WHERE s.tenant_id = ${tenantId}
      `,
    ])) as any[][];

    const cogsResult = (await this.prisma.$queryRaw`
      SELECT SUM(CAST(CAST(cost_price AS DECIMAL(12,2)) * CAST(quantity AS DECIMAL(12,2)) AS DECIMAL(12,2))) as cogs
      FROM sales_invoice_items sii
      JOIN sales_invoices si ON sii.invoice_id = si.invoice_id
      WHERE si.tenant_id = ${tenantId} AND DATE(si.invoice_date) = DATE(${todayStr}::date)
    `) as any[];

    const totalRevenue = Number(invoices[0]?.revenue || 0);
    const cogs = Number(cogsResult[0]?.cogs || 0);

    return {
      totalRevenue,
      totalTransactions: Number(invoices[0]?.count || 0),
      averageBill:
        totalRevenue > 0 ? totalRevenue / Number(invoices[0]?.count || 1) : 0,
      grossProfit: totalRevenue - cogs,
      vatCollected: Number(invoices[0]?.vat || 0),
      totalStockValue: Number(stock[0]?.total_value || 0),
      pendingPayments: Number(invoices[0]?.pending_count || 0),
    };
  }

  private async getYesterdayRevenue(tenantId: string) {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    yesterday.setHours(0, 0, 0, 0);
    const yesterdayStr = yesterday.toISOString().split('T')[0];

    const result = (await this.prisma.$queryRaw`
      SELECT SUM(CAST(total_amount AS DECIMAL(12,2))) as revenue
      FROM sales_invoices 
      WHERE tenant_id = ${tenantId} AND DATE(invoice_date) = DATE(${yesterdayStr}::date)
    `) as any[];

    return Number(result[0]?.revenue || 0);
  }

  private async getLowStockCount(tenantId: string) {
    const result = (await this.prisma.$queryRaw`
      SELECT COUNT(*) as count
      FROM stock s
      JOIN products p ON s.product_id = p.product_id
      WHERE s.tenant_id = ${tenantId} 
        AND p.minimum_stock_level IS NOT NULL
        AND s.quantity <= p.minimum_stock_level
        AND s.quantity > 0
    `) as any[];

    return Number(result[0]?.count || 0);
  }

  private async getOutOfStockCount(tenantId: string) {
    const result = (await this.prisma.$queryRaw`
      SELECT COUNT(*) as count
      FROM stock 
      WHERE tenant_id = ${tenantId} AND quantity = 0
    `) as any[];

    return Number(result[0]?.count || 0);
  }

  private async getTopProducts(tenantId: string) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayStr = today.toISOString().split('T')[0];

    const results = (await this.prisma.$queryRaw`
      SELECT 
        p.product_name as label,
        SUM(CAST(sii.line_total AS DECIMAL(12,2))) as value
      FROM sales_invoice_items sii
      JOIN products p ON sii.product_id = p.product_id
      JOIN sales_invoices si ON sii.invoice_id = si.invoice_id
      WHERE si.tenant_id = ${tenantId} AND DATE(si.invoice_date) = DATE(${todayStr}::date)
      GROUP BY p.product_id, p.product_name
      ORDER BY value DESC
      LIMIT 5
    `) as any[];

    return results.map((r: any) => ({
      label: r.label,
      value: Number(r.value || 0),
    }));
  }

  private async getCategoryBreakdown(tenantId: string) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayStr = today.toISOString().split('T')[0];

    const results = (await this.prisma.$queryRaw`
      SELECT 
        c.category_name as label,
        SUM(CAST(sii.line_total AS DECIMAL(12,2))) as value
      FROM sales_invoice_items sii
      JOIN products p ON sii.product_id = p.product_id
      JOIN categories c ON p.category_id = c.category_id
      JOIN sales_invoices si ON sii.invoice_id = si.invoice_id
      WHERE si.tenant_id = ${tenantId} AND DATE(si.invoice_date) = DATE(${todayStr}::date)
      GROUP BY c.category_id, c.category_name
      ORDER BY value DESC
    `) as any[];

    const total = results.reduce(
      (sum: number, r: any) => sum + Number(r.value || 0),
      0,
    );

    return {
      data: results.map((r: any) => ({
        label: r.label,
        value: Number(r.value || 0),
      })),
      total,
    };
  }

  private async getStaffPerformance(tenantId: string) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayStr = today.toISOString().split('T')[0];

    const results = (await this.prisma.$queryRaw`
      SELECT 
        si.cashier_id,
        COALESCE(u.first_name || ' ' || u.last_name, 'Unknown') as name,
        COUNT(*) as transactions,
        SUM(CAST(si.total_amount AS DECIMAL(12,2))) as revenue
      FROM sales_invoices si
      LEFT JOIN users u ON si.cashier_id = u.user_id
      WHERE si.tenant_id = ${tenantId} AND DATE(si.invoice_date) = DATE(${todayStr}::date)
      GROUP BY si.cashier_id, u.first_name, u.last_name
      ORDER BY revenue DESC
    `) as any[];

    return results.map((r: any) => ({
      cashier_id: r.cashier_id,
      name: r.name,
      transactions: Number(r.transactions || 0),
      revenue: Number(r.revenue || 0),
    }));
  }

  private async getYtdMetrics(tenantId: string) {
    const currentYear = new Date().getFullYear();
    const ytdStart = `${currentYear}-01-01`;

    const results = (await this.prisma.$queryRaw`
      SELECT 
        SUM(CAST(total_revenue AS DECIMAL(12,2))) as ytd_revenue,
        SUM(CAST(vat_collected AS DECIMAL(12,2))) as ytd_vat,
        SUM(CAST(net_profit AS DECIMAL(12,2))) as ytd_profit
      FROM reports_generated 
      WHERE tenant_id = ${tenantId} AND report_date >= DATE(${ytdStart}::date)
    `) as any[];

    return {
      ytdRevenue: Number(results[0]?.ytd_revenue || 0),
      ytdTax: Number(results[0]?.ytd_vat || 0),
      ytdProfit: Number(results[0]?.ytd_profit || 0),
    };
  }

  private async getPaymentBreakdown(tenantId: string) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayStr = today.toISOString().split('T')[0];

    const results = (await this.prisma.$queryRaw`
      SELECT 
        sale_type,
        SUM(CAST(total_amount AS DECIMAL(12,2))) as amount
      FROM sales_invoices
      WHERE tenant_id = ${tenantId} AND DATE(invoice_date) = DATE(${todayStr}::date)
      GROUP BY sale_type
    `) as any[];

    const breakdown = { cash: 0, card: 0, credit: 0 };
    let total = 0;

    results.forEach((r: any) => {
      const amount = Number(r.amount || 0);
      if (r.sale_type === 'cash') breakdown.cash = amount;
      else if (r.sale_type === 'card') breakdown.card = amount;
      else if (r.sale_type === 'credit') breakdown.credit = amount;
      total += amount;
    });

    return {
      cash: breakdown.cash,
      card: breakdown.card,
      credit: breakdown.credit,
      percentages: {
        cash: total > 0 ? ((breakdown.cash / total) * 100).toFixed(2) : '0',
        card: total > 0 ? ((breakdown.card / total) * 100).toFixed(2) : '0',
        credit: total > 0 ? ((breakdown.credit / total) * 100).toFixed(2) : '0',
      },
    };
  }

  async invalidateCache(tenantId: string): Promise<void> {
    try {
      const cacheKey = `dashboard:owner:${tenantId}`;
      await this.redis.del(cacheKey);
      this.logger.debug(
        `Invalidated owner dashboard cache for tenant ${tenantId}`,
      );
    } catch (error) {
      this.logger.warn(`Failed to invalidate cache: ${error.message}`);
    }
  }
}
