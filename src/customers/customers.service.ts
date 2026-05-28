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
        email: c.email || 'N/A',
        address: c.address || 'N/A',
        customerType: c.customerType || 'Individual',
        totalPurchases: Number(c.totalPurchases),
        outstandingBalance: Number(c.outstandingBalance),
        transactionsCount: c.salesInvoices.length,
        isOverdue: Number(c.outstandingBalance) > 0,
        createdAt: c.createdAt
      }))
    };
  }

  async createCustomer(tenantId: string, data: any) {
    const customer = await this.prisma.customer.create({
      data: {
        tenantId,
        name: data.name,
        phone: data.phone,
        email: data.email || null,
        address: data.address || null,
        customerType: data.customerType || 'Individual',
      }
    });

    return {
      status: 'success',
      data: customer
    };
  }

  async updateCustomer(tenantId: string, customerId: string, data: any) {
    const customer = await this.prisma.customer.update({
      where: { id: customerId, tenantId },
      data: {
        name: data.name,
        phone: data.phone,
        email: data.email || null,
        address: data.address || null,
        customerType: data.customerType || 'Individual',
      }
    });

    return {
      status: 'success',
      data: customer
    };
  }
}
