import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

/**
 * Shared Dashboard Query Service
 * Consolidates duplicated query logic from Owner/Manager/Cashier dashboard services
 *
 * PROBLEM: Before consolidation, each dashboard service had identical query methods:
 * - getTodayMetrics() duplicated in 3 files
 * - getPaymentBreakdown() duplicated in 2+ files
 * - getStaffPerformance() duplicated in 2+ files
 * - getLowStockCount() duplicated in 2+ files
 * - getOutOfStockCount() duplicated in 2+ files
 * - getTopProducts() duplicated in 2+ files
 * - getCategoryBreakdown() duplicated in 2+ files
 * - getYtdMetrics() duplicated in 2+ files
 * - getYesterdayRevenue() duplicated in 2+ files
 *
 * SOLUTION: Single source of truth for all dashboard queries
 * - Supports flexible filtering (tenantId, branchId, userId)
 * - Reduces maintenance burden
 * - Ensures consistent query logic across dashboards
 *
 * USAGE:
 * 1. Owner dashboard: Pass tenantId to query all branches
 * 2. Manager dashboard: Pass branchId to query single branch
 * 3. Cashier dashboard: Pass userId to query their transactions
 */
@Injectable()
export class DashboardQueryService {
  private readonly logger = new Logger(DashboardQueryService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Get today's revenue, transactions, profit metrics
   * Supports filtering by tenantId, branchId, or userId (cashier)
   */
  async getTodayMetrics(filter: {
    tenantId: string;
    branchId?: string;
    cashierId?: string;
  }) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayStr = today.toISOString().split('T')[0];

    // Build WHERE clause based on filter type
    let whereClause = `WHERE si.tenant_id = ${this.escape(filter.tenantId)}`;
    if (filter.branchId) {
      whereClause += ` AND si.branch_id = ${this.escape(filter.branchId)}`;
    }
    if (filter.cashierId) {
      whereClause += ` AND si.cashier_id = ${this.escape(filter.cashierId)}`;
    }
    whereClause += ` AND DATE(si.invoice_date) = DATE(${this.escape(todayStr)}::date)`;

    const [invoices, stock] = (await Promise.all([
      this.prisma.$queryRawUnsafe(`
        SELECT 
          COUNT(*) as count,
          SUM(CAST(si.total_amount AS DECIMAL(12,2))) as revenue,
          SUM(CAST(si.tax_amount AS DECIMAL(12,2))) as vat,
          COUNT(CASE WHEN si.payment_status = 'unpaid' OR si.payment_status = 'partial' THEN 1 END) as pending_count
        FROM sales_invoices si
        ${whereClause}
      `),
      this.prisma.$queryRawUnsafe(`
        SELECT SUM(CAST(s.quantity * COALESCE(p.purchase_price, 0) AS DECIMAL(12,2))) as total_value
        FROM stock s
        JOIN products p ON s.product_id = p.product_id
        WHERE s.tenant_id = ${this.escape(filter.tenantId)}
      `),
    ])) as any[][];

    const cogsClause = filter.branchId
      ? `AND si.branch_id = ${this.escape(filter.branchId)}`
      : '';
    const cashierClause = filter.cashierId
      ? `AND si.cashier_id = ${this.escape(filter.cashierId)}`
      : '';

    const cogsResult = (await this.prisma.$queryRawUnsafe(`
      SELECT SUM(CAST(CAST(sii.cost_price AS DECIMAL(12,2)) * CAST(sii.quantity AS DECIMAL(12,2)) AS DECIMAL(12,2))) as cogs
      FROM sales_invoice_items sii
      JOIN sales_invoices si ON sii.invoice_id = si.invoice_id
      WHERE si.tenant_id = ${this.escape(filter.tenantId)} ${cogsClause} ${cashierClause} AND DATE(si.invoice_date) = DATE(${this.escape(todayStr)}::date)
    `)) as any[];

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

  /**
   * Get yesterday's revenue for comparison
   */
  async getYesterdayRevenue(tenantId: string, branchId?: string) {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    yesterday.setHours(0, 0, 0, 0);
    const yesterdayStr = yesterday.toISOString().split('T')[0];

    let whereClause = `WHERE tenant_id = ${this.escape(tenantId)}`;
    if (branchId) {
      whereClause += ` AND branch_id = ${this.escape(branchId)}`;
    }
    whereClause += ` AND DATE(invoice_date) = DATE(${this.escape(yesterdayStr)}::date)`;

    const result = (await this.prisma.$queryRawUnsafe(`
      SELECT SUM(CAST(total_amount AS DECIMAL(12,2))) as revenue
      FROM sales_invoices
      ${whereClause}
    `)) as any[];

    return Number(result[0]?.revenue || 0);
  }

  /**
   * Get count of products with low stock
   */
  async getLowStockCount(tenantId: string) {
    const result = (await this.prisma.$queryRawUnsafe(`
      SELECT COUNT(*) as count
      FROM stock s
      JOIN products p ON s.product_id = p.product_id
      WHERE s.tenant_id = ${this.escape(tenantId)}
        AND p.minimum_stock_level IS NOT NULL
        AND s.quantity <= p.minimum_stock_level
        AND s.quantity > 0
    `)) as any[];

    return Number(result[0]?.count || 0);
  }

  /**
   * Get count of products with zero stock
   */
  async getOutOfStockCount(tenantId: string) {
    const result = (await this.prisma.$queryRawUnsafe(`
      SELECT COUNT(*) as count
      FROM stock
      WHERE tenant_id = ${this.escape(tenantId)} AND quantity = 0
    `)) as any[];

    return Number(result[0]?.count || 0);
  }

  /**
   * Get top 5 products by revenue (today)
   */
  async getTopProducts(filter: {
    tenantId: string;
    branchId?: string;
    cashierId?: string;
  }) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayStr = today.toISOString().split('T')[0];

    let joinCashier = '';
    let whereCashier = '';
    if (filter.cashierId) {
      joinCashier = 'JOIN sales_invoices si ON sii.invoice_id = si.invoice_id';
      whereCashier = ` AND si.cashier_id = ${this.escape(filter.cashierId)}`;
    }

    let query = `
      SELECT 
        p.product_name as label,
        SUM(CAST(sii.line_total AS DECIMAL(12,2))) as value
      FROM sales_invoice_items sii
      JOIN products p ON sii.product_id = p.product_id
      ${filter.cashierId ? joinCashier : 'JOIN sales_invoices si ON sii.invoice_id = si.invoice_id'}
      WHERE si.tenant_id = ${this.escape(filter.tenantId)}
    `;

    if (filter.branchId) {
      query += ` AND si.branch_id = ${this.escape(filter.branchId)}`;
    }
    query += whereCashier;
    query += ` AND DATE(si.invoice_date) = DATE(${this.escape(todayStr)}::date)
      GROUP BY p.product_id, p.product_name
      ORDER BY value DESC
      LIMIT 5
    `;

    const results = (await this.prisma.$queryRawUnsafe(query)) as any[];

    return results.map((r: any) => ({
      label: r.label,
      value: Number(r.value || 0),
    }));
  }

  /**
   * Get category breakdown by revenue (today)
   */
  async getCategoryBreakdown(filter: {
    tenantId: string;
    branchId?: string;
    cashierId?: string;
  }) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayStr = today.toISOString().split('T')[0];

    let joinCashier = '';
    let whereCashier = '';
    if (filter.cashierId) {
      joinCashier = 'JOIN sales_invoices si ON sii.invoice_id = si.invoice_id';
      whereCashier = ` AND si.cashier_id = ${this.escape(filter.cashierId)}`;
    }

    let query = `
      SELECT 
        c.category_name as label,
        SUM(CAST(sii.line_total AS DECIMAL(12,2))) as value
      FROM sales_invoice_items sii
      JOIN products p ON sii.product_id = p.product_id
      JOIN categories c ON p.category_id = c.category_id
      ${filter.cashierId ? joinCashier : 'JOIN sales_invoices si ON sii.invoice_id = si.invoice_id'}
      WHERE si.tenant_id = ${this.escape(filter.tenantId)}
    `;

    if (filter.branchId) {
      query += ` AND si.branch_id = ${this.escape(filter.branchId)}`;
    }
    query += whereCashier;
    query += ` AND DATE(si.invoice_date) = DATE(${this.escape(todayStr)}::date)
      GROUP BY c.category_id, c.category_name
      ORDER BY value DESC
    `;

    const results = (await this.prisma.$queryRawUnsafe(query)) as any[];

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

  /**
   * Get staff performance metrics (today)
   * Only works for owner/manager (not cashier since they only see their own transactions)
   */
  async getStaffPerformance(filter: { tenantId: string; branchId?: string }) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayStr = today.toISOString().split('T')[0];

    let branchFilter = '';
    if (filter.branchId) {
      branchFilter = ` AND si.branch_id = ${this.escape(filter.branchId)}`;
    }

    const results = (await this.prisma.$queryRawUnsafe(`
      SELECT 
        si.cashier_id,
        COALESCE(u.first_name || ' ' || u.last_name, 'Unknown') as name,
        COUNT(*) as transactions,
        SUM(CAST(si.total_amount AS DECIMAL(12,2))) as revenue
      FROM sales_invoices si
      LEFT JOIN users u ON si.cashier_id = u.user_id
      WHERE si.tenant_id = ${this.escape(filter.tenantId)} ${branchFilter} AND DATE(si.invoice_date) = DATE(${this.escape(todayStr)}::date)
      GROUP BY si.cashier_id, u.first_name, u.last_name
      ORDER BY revenue DESC
    `)) as any[];

    return results.map((r: any) => ({
      cashier_id: r.cashier_id,
      name: r.name,
      transactions: Number(r.transactions || 0),
      revenue: Number(r.revenue || 0),
    }));
  }

  /**
   * Get year-to-date metrics
   */
  async getYtdMetrics(tenantId: string, branchId?: string) {
    const currentYear = new Date().getFullYear();
    const ytdStart = `${currentYear}-01-01`;

    let branchFilter = '';
    if (branchId) {
      branchFilter = ` AND branch_id = ${this.escape(branchId)}`;
    }

    const results = (await this.prisma.$queryRawUnsafe(`
      SELECT 
        SUM(CAST(total_revenue AS DECIMAL(12,2))) as ytd_revenue,
        SUM(CAST(vat_collected AS DECIMAL(12,2))) as ytd_vat,
        SUM(CAST(net_profit AS DECIMAL(12,2))) as ytd_profit
      FROM reports_generated
      WHERE tenant_id = ${this.escape(tenantId)} ${branchFilter} AND report_date >= DATE(${this.escape(ytdStart)}::date)
    `)) as any[];

    return {
      ytdRevenue: Number(results[0]?.ytd_revenue || 0),
      ytdTax: Number(results[0]?.ytd_vat || 0),
      ytdProfit: Number(results[0]?.ytd_profit || 0),
    };
  }

  /**
   * Get payment breakdown by sale type (today)
   */
  async getPaymentBreakdown(filter: {
    tenantId: string;
    branchId?: string;
    cashierId?: string;
  }) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayStr = today.toISOString().split('T')[0];

    let whereClause = `WHERE tenant_id = ${this.escape(filter.tenantId)}`;
    if (filter.branchId) {
      whereClause += ` AND branch_id = ${this.escape(filter.branchId)}`;
    }
    if (filter.cashierId) {
      whereClause += ` AND cashier_id = ${this.escape(filter.cashierId)}`;
    }
    whereClause += ` AND DATE(invoice_date) = DATE(${this.escape(todayStr)}::date)`;

    const results = (await this.prisma.$queryRawUnsafe(`
      SELECT 
        sale_type,
        SUM(CAST(total_amount AS DECIMAL(12,2))) as amount
      FROM sales_invoices
      ${whereClause}
      GROUP BY sale_type
    `)) as any[];

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

  /**
   * Utility: Safely escape string values for raw SQL queries
   */
  private escape(value: string): string {
    return `'${value.replace(/'/g, "''")}'`;
  }
}
