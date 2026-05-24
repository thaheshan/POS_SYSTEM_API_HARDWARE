import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class CustomersService {
  constructor(private prisma: PrismaService) {}

  async getCustomers(tenantId: string, query: any) {
    const customers = await this.prisma.customer.findMany({
      where: { tenantId },
      include: {
        salesInvoices: {
          select: { id: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    return {
      status: 'success',
      data: customers.map(c => ({
        id: c.id,
        name: c.name,
        phone: c.phone,
        totalPurchases: Number(c.totalPurchases),
        outstandingBalance: Number(c.outstandingBalance),
        transactionsCount: c.salesInvoices.length,
        isOverdue: Number(c.outstandingBalance) > 0,
        createdAt: c.createdAt
      }))
    };
  }
}
