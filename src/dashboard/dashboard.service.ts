import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class DashboardService {
  constructor(private readonly prisma: PrismaService) {}

  async getStats(tenantId: string) {
    const now = new Date();

    // Today bounds (UTC)
    const todayStart = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()),
    );
    const todayEnd = new Date(todayStart);
    todayEnd.setUTCDate(todayStart.getUTCDate() + 1);

    // This month bounds
    const monthStart = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1),
    );
    const nextMonthStart = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1),
    );

    const [todayAgg, monthAgg, totalCustomers] = await Promise.all([
      // Today's sales aggregate
      this.prisma.salesInvoice.aggregate({
        where: {
          tenantId,
          createdAt: { gte: todayStart, lt: todayEnd },
          status: 'COMPLETED',
        },
        _sum: { totalAmount: true },
        _count: { id: true },
      }),
      // Monthly revenue aggregate
      this.prisma.salesInvoice.aggregate({
        where: {
          tenantId,
          createdAt: { gte: monthStart, lt: nextMonthStart },
          status: 'COMPLETED',
        },
        _sum: { totalAmount: true },
        _count: { id: true },
      }),
      // Total customers
      this.prisma.customer.count({ where: { tenantId } }),
    ]);

    return {
      todaySales: Number(todayAgg._sum.totalAmount ?? 0),
      todayTransactions: todayAgg._count.id,
      monthlyRevenue: Number(monthAgg._sum.totalAmount ?? 0),
      monthlyTransactions: monthAgg._count.id,
      totalCustomers,
    };
  }

  async getTopProducts(tenantId: string) {
    const now = new Date();
    const thirtyDaysAgo = new Date(now);
    thirtyDaysAgo.setDate(now.getDate() - 30);

    // Aggregate sales invoice items grouped by product for last 30 days
    const items = await this.prisma.salesInvoiceItem.groupBy({
      by: ['productId'],
      where: {
        invoice: {
          tenantId,
          createdAt: { gte: thirtyDaysAgo },
          status: 'COMPLETED',
        },
      },
      _sum: { quantity: true, lineTotal: true },
      orderBy: { _sum: { lineTotal: 'desc' } },
      take: 5,
    });

    if (items.length === 0) return [];

    const productIds = items.map((i) => i.productId);
    const products = await this.prisma.product.findMany({
      where: { id: { in: productIds } },
      select: { id: true, name: true },
    });

    return items.map((item) => {
      const product = products.find((p) => p.id === item.productId);
      return {
        id: item.productId,
        name: product?.name ?? 'Unknown',
        totalQty: Number(item._sum.quantity ?? 0),
        totalRevenue: Number(item._sum.lineTotal ?? 0),
      };
    });
  }

  async getRecentTransactions(tenantId: string, limit = 10) {
    const invoices = await this.prisma.salesInvoice.findMany({
      where: { tenantId },
      include: { customer: { select: { name: true } } },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });

    return invoices.map((inv) => ({
      id: inv.id,
      invoiceNumber: inv.invoiceNumber,
      customerName: inv.customer?.name ?? 'Walk-in',
      date: inv.createdAt.toISOString(),
      amount: Number(inv.totalAmount),
      status: inv.paymentStatus,
    }));
  }

  async getWeeklyChart(tenantId: string) {
    const now = new Date();
    const sevenDaysAgo = new Date(now);
    sevenDaysAgo.setDate(now.getDate() - 6);
    sevenDaysAgo.setUTCHours(0, 0, 0, 0);

    const invoices = await this.prisma.salesInvoice.findMany({
      where: {
        tenantId,
        createdAt: { gte: sevenDaysAgo },
        status: 'COMPLETED',
      },
      select: { createdAt: true, totalAmount: true },
      orderBy: { createdAt: 'asc' },
    });

    // Build map for last 7 days
    const dayMap = new Map<string, { revenue: number; sales: number }>();
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(now.getDate() - i);
      const key = d.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        timeZone: 'UTC',
      });
      dayMap.set(key, { revenue: 0, sales: 0 });
    }

    for (const inv of invoices) {
      const key = inv.createdAt.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        timeZone: 'UTC',
      });
      if (dayMap.has(key)) {
        const cur = dayMap.get(key)!;
        cur.revenue += Number(inv.totalAmount);
        cur.sales += 1;
        dayMap.set(key, cur);
      }
    }

    return Array.from(dayMap.entries()).map(([name, val]) => ({
      name,
      revenue: Math.round(val.revenue),
      sales: val.sales,
      cost: Math.round(val.revenue * 0.72), // estimated cost ~72% of revenue
    }));
  }
}
