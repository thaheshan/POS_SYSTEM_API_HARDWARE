import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class DashboardService {
  constructor(private readonly prisma: PrismaService) {}

  async getStats(tenantId: string, user?: any) {
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

    const userRole = (user?.role || '').toLowerCase();
    const isStaff = userRole === 'staff' || userRole === 'cashier';

    let staffSales = 0;
    let staffTransactions = 0;
    let staffServiceRevenue = 0;
    let staffServiceEntries = 0;
    let staffActiveOrders = 0;

    if (isStaff && user?.user_id) {
      const [salesAgg, serviceAgg, activeOrders] = await Promise.all([
        this.prisma.salesInvoice.aggregate({
          where: { 
            tenantId, 
            cashierId: user.user_id, 
            status: 'COMPLETED',
            createdAt: { gte: todayStart, lt: todayEnd }
          } as any,
          _sum: { totalAmount: true },
          _count: { id: true },
        }),
        this.prisma.expense.aggregate({
          where: { 
            tenantId, 
            userId: user.user_id, 
            status: 'COMPLETED',
            createdAt: { gte: todayStart, lt: todayEnd }
          },
          _sum: { amount: true },
          _count: { id: true },
        }),
        this.prisma.salesInvoice.count({
          where: { tenantId, cashierId: user.user_id, paymentStatus: 'UNPAID' } as any,
        }),
      ]);

      staffSales = Number(salesAgg._sum?.totalAmount ?? 0);
      staffTransactions = salesAgg._count?.id ?? 0;
      staffServiceRevenue = Number(serviceAgg._sum?.amount ?? 0);
      staffServiceEntries = serviceAgg._count?.id ?? 0;
      staffActiveOrders = activeOrders;
    }

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
      ...(isStaff && {
        staffSales,
        staffTransactions,
        staffServiceRevenue,
        staffServiceEntries,
        staffActiveOrders,
      }),
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

  async getRecentTransactions(tenantId: string, limit = 10, user?: any) {
    const isStaff = user?.role === 'staff' || user?.role === 'cashier';
    const whereClause: any = { tenantId };

    if (isStaff && user?.user_id) {
      whereClause.cashierId = user.user_id;
    }

    const invoices = await this.prisma.salesInvoice.findMany({
      where: whereClause,
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

  async getPendingPayments(tenantId: string, user: any) {
    const isStaff = user?.role === 'staff' || user?.role === 'cashier';
    const whereClause: any = {
      tenantId,
      paymentStatus: 'UNPAID',
    };

    if (isStaff && user?.user_id) {
      whereClause.cashierId = user.user_id;
    }

    const pending = await this.prisma.salesInvoice.findMany({
      where: whereClause,
      select: {
        id: true,
        invoiceNumber: true,
        createdAt: true,
        totalAmount: true,
        customer: { select: { name: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 10,
    });

    return pending.map(p => ({
      id: p.id,
      invoiceNumber: p.invoiceNumber,
      date: p.createdAt,
      amount: Number(p.totalAmount),
      customerName: p.customer ? p.customer.name : 'Walk-in',
    }));
  }
}
