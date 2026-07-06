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
            createdAt: { gte: todayStart, lt: todayEnd },
          } as any,
          _sum: { totalAmount: true },
          _count: { id: true },
        }),
        this.prisma.expense.aggregate({
          where: {
            tenantId,
            userId: user.user_id,
            status: 'COMPLETED',
            createdAt: { gte: todayStart, lt: todayEnd },
          },
          _sum: { amount: true },
          _count: { id: true },
        }),
        this.prisma.salesInvoice.count({
          where: {
            tenantId,
            cashierId: user.user_id,
            paymentStatus: 'UNPAID',
          } as any,
        }),
      ]);

      staffSales = Number(salesAgg._sum?.totalAmount ?? 0);
      staffTransactions = salesAgg._count?.id ?? 0;
      staffServiceRevenue = Number(serviceAgg._sum?.amount ?? 0);
      staffServiceEntries = serviceAgg._count?.id ?? 0;
      staffActiveOrders = activeOrders;
    }

    const [
      todayAgg,
      monthAgg,
      monthPurchases,
      monthExpenses,
      monthSalesItems,
      totalCustomers,
    ] = await Promise.all([
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
      // Monthly revenue aggregate (Sales)
      this.prisma.salesInvoice.aggregate({
        where: {
          tenantId,
          createdAt: { gte: monthStart, lt: nextMonthStart },
          status: 'COMPLETED',
        },
        _sum: { totalAmount: true },
        _count: { id: true },
      }),
      // Monthly purchases aggregate (GRNs)
      this.prisma.grnItem.aggregate({
        where: {
          grn: {
            tenantId,
            receivedDate: { gte: monthStart, lt: nextMonthStart },
            status: 'completed', // Using default status format from schema
          },
        },
        _sum: { totalCost: true },
      }),
      // Monthly expenses aggregate (Category C)
      this.prisma.expense.aggregate({
        where: {
          tenantId,
          createdAt: { gte: monthStart, lt: nextMonthStart },
          status: 'COMPLETED',
        },
        _sum: { amount: true },
      }),
      // Monthly COGS aggregate (Sales Items) - include product.purchasePrice as fallback
      this.prisma.salesInvoiceItem.findMany({
        where: {
          invoice: {
            tenantId,
            createdAt: { gte: monthStart, lt: nextMonthStart },
            status: 'COMPLETED',
            invoiceNumber: { not: { startsWith: 'RET-' } },
          },
        },
        select: {
          quantity: true,
          costPrice: true,
          lineTotal: true,
          product: { select: { purchasePrice: true } },
        },
      }),
      // Total customers
      this.prisma.customer.count({ where: { tenantId } }),
    ]);

    const salesTotal = Number(monthAgg._sum.totalAmount ?? 0);
    const purchasesTotal = Number(monthPurchases._sum.totalCost ?? 0);
    const expensesTotal = Number(monthExpenses._sum.amount ?? 0);

    let cogsTotal = 0;
    for (const item of monthSalesItems as any[]) {
      const qty = Number(item.quantity ?? 0);
      // Use saved costPrice first, fall back to product's purchasePrice
      const unitCost = Number(
        item.costPrice ?? item.product?.purchasePrice ?? 0,
      );
      const itemCogs = qty * unitCost;
      cogsTotal += itemCogs;
    }

    // Gross Profit is actual Revenue minus actual COGS
    const grossProfit = salesTotal - cogsTotal;

    // Net Profit = Gross Product Margin - Category C Expenses
    const netRevenue = grossProfit - expensesTotal;

    return {
      todaySales: Number(todayAgg._sum.totalAmount ?? 0),
      todayTransactions: todayAgg._count.id,
      monthlyRevenue: salesTotal,
      monthlyProfit: netRevenue,
      monthlySales: salesTotal, // useful for potential debugging or future UI
      monthlyPurchases: purchasesTotal,
      monthlyExpenses: expensesTotal,
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

  async getWeeklyChart(tenantId: string, days = 7) {
    const now = new Date();
    const startDate = new Date(now);
    startDate.setDate(now.getDate() - (days - 1));
    startDate.setUTCHours(0, 0, 0, 0);

    const [invoices, expenses] = await Promise.all([
      this.prisma.salesInvoice.findMany({
        where: {
          tenantId,
          createdAt: { gte: startDate },
          status: 'COMPLETED',
        },
        select: {
          createdAt: true,
          totalAmount: true,
          invoiceNumber: true,
          items: {
            select: {
              quantity: true,
              costPrice: true,
              lineTotal: true,
              product: { select: { purchasePrice: true } },
            },
          },
        },
        orderBy: { createdAt: 'asc' },
      }),
      this.prisma.expense.findMany({
        where: {
          tenantId,
          createdAt: { gte: startDate },
          status: 'COMPLETED',
        },
        select: { createdAt: true, amount: true },
      }),
    ]);

    // Build map for last `days` days: revenue = total sales, cost = COGS + expenses, margin = revenue - COGS
    const dayMap = new Map<
      string,
      { revenue: number; sales: number; cost: number; margin: number }
    >();
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(now.getDate() - i);
      const key = d.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        timeZone: 'UTC',
      });
      dayMap.set(key, { revenue: 0, sales: 0, cost: 0, margin: 0 });
    }

    // Process Sales + COGS from invoice items in one pass
    for (const inv of invoices as any[]) {
      const key = inv.createdAt.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        timeZone: 'UTC',
      });
      if (dayMap.has(key)) {
        const cur = dayMap.get(key)!;
        cur.revenue += Number(inv.totalAmount);
        cur.sales += 1;
        let cogs = 0;
        // Ignore negative items from old RET- invoices to prevent double-deducting COGS
        if (!inv.invoiceNumber.startsWith('RET-')) {
          for (const item of inv.items || []) {
            const qty = Number(item.quantity ?? 0);
            const unitCost = Number(
              item.costPrice ?? item.product?.purchasePrice ?? 0,
            );
            cogs += qty * unitCost;
          }
        }
        cur.cost += cogs;
        cur.margin += Number(inv.totalAmount) - cogs;
        dayMap.set(key, cur);
      }
    }

    // Process Expenses (Cost)
    for (const exp of expenses) {
      const key = exp.createdAt.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        timeZone: 'UTC',
      });
      if (dayMap.has(key)) {
        const cur = dayMap.get(key)!;
        cur.cost += Number(exp.amount);
        dayMap.set(key, cur);
      }
    }

    return Array.from(dayMap.entries()).map(([name, val]) => ({
      name,
      revenue: Math.round(val.revenue - val.cost), // User defines Revenue as Net Profit (Sales - COGS - Expenses)
      margin: Math.round(val.margin), // Gross margin
      sales: val.sales,
      cost: Math.round(val.cost), // Product Cost + Expenses
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

    return pending.map((p) => ({
      id: p.id,
      invoiceNumber: p.invoiceNumber,
      date: p.createdAt,
      amount: Number(p.totalAmount),
      customerName: p.customer ? p.customer.name : 'Walk-in',
    }));
  }

  async getSummary(tenantId: string, startDate?: string, endDate?: string) {
    const whereDateSales: any = {};
    const whereDateGRN: any = {};
    const whereDateExp: any = {};

    if (startDate) {
      const start = new Date(startDate);
      start.setUTCHours(0, 0, 0, 0);
      whereDateSales.gte = start;
      whereDateGRN.gte = start;
      whereDateExp.gte = start;
    }

    if (endDate) {
      const end = new Date(endDate);
      end.setUTCHours(23, 59, 59, 999);
      whereDateSales.lte = end;
      whereDateGRN.lte = end;
      whereDateExp.lte = end;
    }

    const [salesAgg, purchasesAgg, expensesAgg, salesItemsAgg] =
      await Promise.all([
        this.prisma.salesInvoice.aggregate({
          where: {
            tenantId,
            status: 'COMPLETED',
            ...(Object.keys(whereDateSales).length > 0 && {
              createdAt: whereDateSales,
            }),
          },
          _sum: { totalAmount: true },
        }),
        this.prisma.grnItem.aggregate({
          where: {
            grn: {
              tenantId,
              status: 'completed',
              ...(Object.keys(whereDateGRN).length > 0 && {
                receivedDate: whereDateGRN,
              }),
            },
          },
          _sum: { totalCost: true },
        }),
        this.prisma.expense.aggregate({
          where: {
            tenantId,
            status: 'COMPLETED',
            ...(Object.keys(whereDateExp).length > 0 && {
              createdAt: whereDateExp,
            }),
          },
          _sum: { amount: true },
        }),
        this.prisma.salesInvoiceItem.findMany({
          where: {
            invoice: {
              tenantId,
              status: 'COMPLETED',
              invoiceNumber: { not: { startsWith: 'RET-' } },
              ...(Object.keys(whereDateSales).length > 0 && {
                createdAt: whereDateSales,
              }),
            },
          },
          select: {
            quantity: true,
            costPrice: true,
            lineTotal: true,
            product: { select: { purchasePrice: true } },
          },
        }),
      ]);

    const totalSales = Number(salesAgg._sum.totalAmount ?? 0);
    const totalPurchases = Number(purchasesAgg._sum.totalCost ?? 0);
    const totalExpenses = Number(expensesAgg._sum.amount ?? 0);

    let cogsTotal = 0;
    for (const item of salesItemsAgg as any[]) {
      const qty = Number(item.quantity ?? 0);
      const unitCost = Number(
        item.costPrice ?? item.product?.purchasePrice ?? 0,
      );
      const itemCogs = qty * unitCost;
      cogsTotal += itemCogs;
    }

    // Gross Profit is actual Revenue minus actual COGS
    const grossProfit = totalSales - cogsTotal;

    // Net Profit = Gross Product Margin - Category C Expenses
    const netProfit = grossProfit - totalExpenses;

    return {
      totalSales, // Total selling price (turnover)
      totalPurchases, // GRN purchases (informational)
      totalExpenses, // Category C expenses
      cogs: cogsTotal, // Product cost (cost price × qty)
      grossProfit, // Product margin before expenses
      netProfit, // Final profit: grossProfit - expenses
    };
  }
}
