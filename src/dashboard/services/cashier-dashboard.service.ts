import { Injectable, Inject, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import type { CacheClient } from 'src/cache/cache-client.interface';
import { CashierDashboardResponseDto } from '../dtos/cashier-dashboard.dto';

@Injectable()
export class CashierDashboardService {
  private readonly logger = new Logger(CashierDashboardService.name);
  private readonly cacheTtlSeconds = 300; // 5 minutes

  constructor(
    private readonly prisma: PrismaService,
    @Inject('REDIS_CLIENT') private readonly redis: CacheClient,
  ) {}

  async getCashierDashboard(
    tenantId: string,
    userId: string,
  ): Promise<CashierDashboardResponseDto> {
    const cacheKey = `dashboard:cashier:${tenantId}:${userId}`;

    try {
      const cached = await this.redis.get(cacheKey);
      if (cached) {
        return JSON.parse(cached);
      }
    } catch (error) {
      this.logger.warn(`Cache get error: ${error.message}`);
    }

    // Fetch all metrics in parallel
    const [todayMetrics, heldBills, lastTransactions, cashCollected] =
      await Promise.all([
        this.getTodayMetrics(userId),
        this.getHeldBills(tenantId, userId),
        this.getLastTransactions(userId),
        this.getCashCollected(userId),
      ]);

    const response: CashierDashboardResponseDto = {
      user_id: userId,
      my_transactions_today: todayMetrics.count,
      my_sales_value_today: todayMetrics.totalRevenue,
      my_average_bill: todayMetrics.averageBill,
      my_held_bills_count: heldBills.length,
      my_held_bills_value: heldBills.reduce((sum, b) => sum + b.amount, 0),
      last_transactions: lastTransactions,
      held_bills: heldBills,
      total_held_value: heldBills.reduce((sum, b) => sum + b.amount, 0),
      cash_collected_today: cashCollected,
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

  private async getTodayMetrics(userId: string) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayStr = today.toISOString().split('T')[0];

    const result = (await this.prisma.$queryRaw`
      SELECT 
        COUNT(*) as count,
        SUM(CAST(total_amount AS DECIMAL(12,2))) as revenue
      FROM sales_invoices 
      WHERE cashier_id = ${userId} 
        AND status = 'completed'
        AND DATE(invoice_date) = DATE(${todayStr}::date)
    `) as any[];

    const totalRevenue = Number(result[0]?.revenue || 0);
    const count = Number(result[0]?.count || 0);

    return {
      count,
      totalRevenue,
      averageBill: count > 0 ? totalRevenue / count : 0,
    };
  }

  private async getHeldBills(tenantId: string, userId: string) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayStr = today.toISOString().split('T')[0];

    const results = (await this.prisma.$queryRaw`
      SELECT 
        invoice_id,
        invoice_number,
        CAST(total_amount AS DECIMAL(12,2)) as amount,
        COALESCE(customer_name, 'Walk-in') as customer_name,
        created_at
      FROM sales_invoices 
      WHERE tenant_id = ${tenantId}
        AND cashier_id = ${userId}
        AND status = 'pending'
        AND DATE(invoice_date) = DATE(${todayStr}::date)
      ORDER BY created_at DESC
    `) as any[];

    return results.map((r: any) => ({
      invoice_id: r.invoice_id,
      invoice_number: r.invoice_number,
      amount: Number(r.amount || 0),
      customer_name: r.customer_name,
      created_at: r.created_at,
    }));
  }

  private async getLastTransactions(userId: string) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayStr = today.toISOString().split('T')[0];

    const results = (await this.prisma.$queryRaw`
      SELECT 
        invoice_id,
        invoice_number,
        CAST(total_amount AS DECIMAL(12,2)) as amount,
        sale_type,
        created_at
      FROM sales_invoices 
      WHERE cashier_id = ${userId} 
        AND status = 'completed'
        AND DATE(invoice_date) = DATE(${todayStr}::date)
      ORDER BY created_at DESC
      LIMIT 10
    `) as any[];

    return results.map((r: any) => ({
      invoice_id: r.invoice_id,
      invoice_number: r.invoice_number,
      amount: Number(r.amount || 0),
      sale_type: r.sale_type,
      generated_at: r.created_at,
    }));
  }

  private async getCashCollected(userId: string) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayStr = today.toISOString().split('T')[0];

    const result = (await this.prisma.$queryRaw`
      SELECT SUM(CAST(total_amount AS DECIMAL(12,2))) as cash_amount
      FROM sales_invoices 
      WHERE cashier_id = ${userId} 
        AND sale_type = 'cash'
        AND status = 'completed'
        AND DATE(invoice_date) = DATE(${todayStr}::date)
    `) as any[];

    return Number(result[0]?.cash_amount || 0);
  }

  async invalidateCache(tenantId: string, userId: string): Promise<void> {
    try {
      const cacheKey = `dashboard:cashier:${tenantId}:${userId}`;
      await this.redis.del(cacheKey);
      this.logger.debug(
        `Invalidated cashier dashboard cache for user ${userId}`,
      );
    } catch (error) {
      this.logger.warn(`Failed to invalidate cache: ${error.message}`);
    }
  }
}
