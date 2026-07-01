import { Injectable, Inject, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import type { CacheClient } from 'src/cache/cache-client.interface';
import { ManagerDashboardResponseDto } from '../dtos/manager-dashboard.dto';

@Injectable()
export class ManagerDashboardService {
  private readonly logger = new Logger(ManagerDashboardService.name);
  private readonly cacheTtlSeconds = 300; // 5 minutes

  constructor(
    private readonly prisma: PrismaService,
    @Inject('REDIS_CLIENT') private readonly redis: CacheClient,
  ) {}

  async getManagerDashboard(
    tenantId: string,
    branchId: string,
  ): Promise<ManagerDashboardResponseDto> {
    const cacheKey = `dashboard:manager:${tenantId}:${branchId}`;

    try {
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
      heldBills,
      staffPerformance,
      topProducts,
      reorderAlerts,
      stockValue,
      paymentBreakdown,
      customerMetrics,
    ] = await Promise.all([
      this.getTodayMetrics(branchId),
      this.getYesterdayRevenue(branchId),
      this.getHeldBills(branchId),
      this.getStaffPerformance(branchId),
      this.getTopProducts(branchId),
      this.getReorderAlerts(tenantId, branchId),
      this.getBranchStockValue(branchId),
      this.getPaymentBreakdown(branchId),
      this.getCustomerMetrics(tenantId, branchId),
    ]);

    const vsPct =
      yesterdayRevenue > 0
        ? ((todayMetrics.totalRevenue - yesterdayRevenue) / yesterdayRevenue) *
          100
        : 0;

    const response: ManagerDashboardResponseDto = {
      branch_id: branchId,
      revenue_today: todayMetrics.totalRevenue,
      vs_yesterday_pct: Math.round(vsPct * 100) / 100,
      active_held_bills: heldBills.count,
      held_bills_value: heldBills.totalValue,
      staff_performance: staffPerformance,
      top_products: topProducts,
      reorder_alerts: reorderAlerts,
      branch_stock_value: stockValue,
      total_transactions_today: todayMetrics.totalTransactions,
      average_bill_today: todayMetrics.averageBill,
      payment_breakdown: paymentBreakdown,
      branch_gross_profit: todayMetrics.grossProfit,
      average_margin_pct:
        todayMetrics.totalRevenue > 0
          ? (todayMetrics.grossProfit / todayMetrics.totalRevenue) * 100
          : 0,
      customer_count_today: customerMetrics.totalCustomers,
      new_customers_today: customerMetrics.newCustomers,
      generated_at: new Date().toISOString(),
    };

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

  private async getTodayMetrics(branchId: string) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayStr = today.toISOString().split('T')[0];

    const result = (await this.prisma.$queryRaw`
      SELECT 
        COUNT(*) as count,
        SUM(CAST(total_amount AS DECIMAL(12,2))) as revenue,
        SUM(CAST(tax_amount AS DECIMAL(12,2))) as vat
      FROM sales_invoices 
      WHERE branch_id = ${branchId} AND DATE(invoice_date) = DATE(${todayStr}::date)
    `) as any[];

    const cogsResult = (await this.prisma.$queryRaw`
      SELECT SUM(CAST(CAST(cost_price AS DECIMAL(12,2)) * CAST(quantity AS DECIMAL(12,2)) AS DECIMAL(12,2))) as cogs
      FROM sales_invoice_items sii
      JOIN sales_invoices si ON sii.invoice_id = si.invoice_id
      WHERE si.branch_id = ${branchId} AND DATE(si.invoice_date) = DATE(${todayStr}::date)
    `) as any[];

    const totalRevenue = Number(result[0]?.revenue || 0);
    const cogs = Number(cogsResult[0]?.cogs || 0);

    return {
      totalRevenue,
      totalTransactions: Number(result[0]?.count || 0),
      averageBill:
        totalRevenue > 0 ? totalRevenue / Number(result[0]?.count || 1) : 0,
      grossProfit: totalRevenue - cogs,
      vatCollected: Number(result[0]?.vat || 0),
    };
  }

  private async getYesterdayRevenue(branchId: string) {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    yesterday.setHours(0, 0, 0, 0);
    const yesterdayStr = yesterday.toISOString().split('T')[0];

    const result = (await this.prisma.$queryRaw`
      SELECT SUM(CAST(total_amount AS DECIMAL(12,2))) as revenue
      FROM sales_invoices 
      WHERE branch_id = ${branchId} AND DATE(invoice_date) = DATE(${yesterdayStr}::date)
    `) as any[];

    return Number(result[0]?.revenue || 0);
  }

  private async getHeldBills(branchId: string) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayStr = today.toISOString().split('T')[0];

    const result = (await this.prisma.$queryRaw`
      SELECT 
        COUNT(*) as count,
        SUM(CAST(total_amount AS DECIMAL(12,2))) as total_value
      FROM sales_invoices 
      WHERE branch_id = ${branchId} 
        AND status = 'pending'
        AND DATE(invoice_date) = DATE(${todayStr}::date)
    `) as any[];

    return {
      count: Number(result[0]?.count || 0),
      totalValue: Number(result[0]?.total_value || 0),
    };
  }

  private async getStaffPerformance(branchId: string) {
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
      WHERE si.branch_id = ${branchId} AND DATE(si.invoice_date) = DATE(${todayStr}::date)
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

  private async getTopProducts(branchId: string) {
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
      WHERE si.branch_id = ${branchId} AND DATE(si.invoice_date) = DATE(${todayStr}::date)
      GROUP BY p.product_id, p.product_name
      ORDER BY value DESC
      LIMIT 5
    `) as any[];

    return results.map((r: any) => ({
      label: r.label,
      value: Number(r.value || 0),
    }));
  }

  private async getReorderAlerts(tenantId: string, branchId: string) {
    const results = (await this.prisma.$queryRaw`
      SELECT 
        p.product_id,
        p.product_name,
        s.quantity as current_quantity,
        COALESCE(p.reorder_quantity, 0) as reorder_quantity,
        CASE 
          WHEN s.quantity = 0 THEN 'critical'
          WHEN s.quantity <= COALESCE(p.minimum_stock_level, 0) THEN 'low'
          ELSE 'ok'
        END as status
      FROM stock s
      JOIN products p ON s.product_id = p.product_id
      WHERE s.tenant_id = ${tenantId}
        AND s.branch_id = ${branchId}
        AND (s.quantity <= COALESCE(p.minimum_stock_level, 99999) OR s.quantity = 0)
      ORDER BY s.quantity ASC
      LIMIT 10
    `) as any[];

    return results.map((r: any) => ({
      product_id: r.product_id,
      product_name: r.product_name,
      current_quantity: Number(r.current_quantity || 0),
      reorder_quantity: Number(r.reorder_quantity || 0),
      status: r.status,
    }));
  }

  private async getBranchStockValue(branchId: string) {
    const result = (await this.prisma.$queryRaw`
      SELECT SUM(CAST(s.quantity * COALESCE(p.purchase_price, 0) AS DECIMAL(12,2))) as total_value
      FROM stock s
      JOIN products p ON s.product_id = p.product_id
      WHERE s.branch_id = ${branchId}
    `) as any[];

    return Number(result[0]?.total_value || 0);
  }

  private async getPaymentBreakdown(branchId: string) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayStr = today.toISOString().split('T')[0];

    const results = (await this.prisma.$queryRaw`
      SELECT 
        sale_type,
        SUM(CAST(total_amount AS DECIMAL(12,2))) as amount
      FROM sales_invoices
      WHERE branch_id = ${branchId} AND DATE(invoice_date) = DATE(${todayStr}::date)
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

  private async getCustomerMetrics(tenantId: string, branchId: string) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayStr = today.toISOString().split('T')[0];

    const results = (await this.prisma.$queryRaw`
      SELECT 
        COUNT(DISTINCT si.customer_id) as total_customers,
        COUNT(DISTINCT CASE WHEN c.created_at >= DATE(${todayStr}::date) THEN c.customer_id END) as new_customers
      FROM sales_invoices si
      LEFT JOIN customers c ON si.customer_id = c.customer_id
      WHERE si.branch_id = ${branchId} AND DATE(si.invoice_date) = DATE(${todayStr}::date)
    `) as any[];

    return {
      totalCustomers: Number(results[0]?.total_customers || 0),
      newCustomers: Number(results[0]?.new_customers || 0),
    };
  }

  async invalidateCache(tenantId: string, branchId: string): Promise<void> {
    try {
      const cacheKey = `dashboard:manager:${tenantId}:${branchId}`;
      await this.redis.del(cacheKey);
      this.logger.debug(
        `Invalidated manager dashboard cache for branch ${branchId}`,
      );
    } catch (error) {
      this.logger.warn(`Failed to invalidate cache: ${error.message}`);
    }
  }
}
