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
          select: { id: true, totalAmount: true, balance: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    return {
      status: 'success',
      data: customers.map(c => {
        // Calculate true values from invoices if the mock data didn't update the cached fields
        const calculatedTotal = c.salesInvoices.reduce((sum, inv) => sum + Number(inv.totalAmount || 0), 0);
        const calculatedOutstanding = c.salesInvoices.reduce((sum, inv) => sum + Number(inv.balance || 0), 0);
        
        const finalTotal = Math.max(Number(c.totalPurchases || 0), calculatedTotal);
        const finalOutstanding = Math.max(Number(c.outstandingBalance || 0), calculatedOutstanding);

        return {
          id: c.id,
          name: c.name,
          phone: c.phone,
          email: c.email || 'N/A',
          address: c.address || 'N/A',
          customerType: c.customerType || 'Individual',
          totalPurchases: finalTotal,
          outstandingBalance: finalOutstanding,
          transactionsCount: c.salesInvoices.length,
          isOverdue: finalOutstanding > 0,
          createdAt: c.createdAt
        };
      })
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

  async deleteCustomer(tenantId: string, customerId: string) {
    await this.prisma.customer.delete({
      where: { id: customerId, tenantId },
    });

    return {
      status: 'success',
      message: 'Customer deleted successfully',
    };
  }
}

