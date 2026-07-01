import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import type { CacheClient } from 'src/cache/cache-client.interface';
import { ReportResponseDto } from '../dtos/report-response.dto';

@Injectable()
export class DailyService {
  private readonly reportCacheTtlSeconds = 1800; // 30 minutes

  constructor(
    private readonly prisma: PrismaService,
    @Inject('REDIS_CLIENT') private readonly redis: CacheClient,
  ) {}

  async getReportByDate(
    tenantId: string,
    date: string,
    branchId: string,
  ): Promise<ReportResponseDto> {
    // Check cache first
    const cacheKey = this.getCacheKey(tenantId, date, branchId);
    const cached = await this.redis.get(cacheKey);
    if (cached) {
      return JSON.parse(cached);
    }

    // Fetch from database
    const reportDate = new Date(date);
    reportDate.setHours(0, 0, 0, 0);

    const report = await this.prisma.reportsGenerated.findUnique({
      where: {
        unique_report_per_day: {
          tenantId,
          branchId,
          reportDate,
        },
      },
    });

    if (!report) {
      throw new NotFoundException(
        `No report found for date ${date} and branch ${branchId}`,
      );
    }

    // Convert database record to response DTO
    const response: ReportResponseDto = {
      id: report.id,
      tenant_id: report.tenantId,
      branch_id: report.branchId,
      report_date: date,
      total_revenue: Number(report.totalRevenue),
      total_transactions: report.totalTransactions,
      average_bill: Number(report.averageBill),
      largest_transaction: Number(report.largestTransaction),
      smallest_transaction: Number(report.smallestTransaction),
      payment_breakdown: {
        cash: Number(report.cashAmount),
        card: Number(report.cardAmount),
        credit: Number(report.creditAmount),
        percentages: report.paymentPercentages as any,
      },
      cogs: Number(report.cogs),
      gross_profit: Number(report.grossProfit),
      operating_expenses: Number(report.operatingExpenses),
      net_profit: Number(report.netProfit),
      vat_collected: Number(report.vatCollected),
      vat_paid: Number(report.vatPaid),
      net_vat: Number(report.netVat),
      category_rankings: (report.categoryRankings as any) || [],
      staff_performance: (report.staffPerformance as any) || [],
      low_stock_items: (report.lowStockItems as any) || [],
      out_of_stock_items: (report.outOfStockItems as any) || [],
      created_at: report.createdAt.toISOString(),
      updated_at: report.updatedAt.toISOString(),
    };

    // Cache the response
    await this.redis.set(
      cacheKey,
      JSON.stringify(response),
      'EX',
      this.reportCacheTtlSeconds,
    );

    return response;
  }

  private getCacheKey(
    tenantId: string,
    date: string,
    branchId: string,
  ): string {
    return `daily_report:${tenantId}:${date}:${branchId}`;
  }
}
