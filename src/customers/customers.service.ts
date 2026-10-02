import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class CustomersService {
  constructor(private prisma: PrismaService) {}

  async getCustomers(tenantId: string, query: any) {
    const customers = await this.prisma.customer.findMany({
      where: { tenantId },
      select: {
        id: true,
        name: true,
        phone: true,
        email: true,
        address: true,
        customerType: true,
        outstandingBalance: true,
        totalPurchases: true,
        createdAt: true,
        _count: {
          select: { salesInvoices: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    return {
      status: 'success',
      data: customers.map(c => {
        const calculatedOutstanding = Number(c.outstandingBalance || 0);
        const calculatedTotal = Number(c.totalPurchases || 0);

        return {
          id: c.id,
          name: c.name,
          phone: c.phone,
          email: c.email || 'N/A',
          address: c.address || 'N/A',
          customerType: c.customerType || 'Individual',
          totalPurchases: Number(calculatedTotal.toFixed(2)),
          outstandingBalance: Number(calculatedOutstanding.toFixed(2)),
          creditBalance: Number(calculatedOutstanding.toFixed(2)),
          transactionsCount: c._count.salesInvoices,
          isOverdue: calculatedOutstanding > 0,
          createdAt: c.createdAt
        };
      })
    };
  }

  async getCustomerById(tenantId: string, customerId: string) {
    const customer = await this.prisma.customer.findFirst({
      where: { id: customerId, tenantId },
      include: {
        salesInvoices: {
          select: { id: true, totalAmount: true, balance: true, invoiceNumber: true, createdAt: true, paymentStatus: true }
        }
      }
    });

    if (!customer) {
      return { status: 'error', message: 'Customer not found' };
    }

    const calculatedTotal = customer.salesInvoices.reduce((sum, inv) => sum + Number(inv.totalAmount || 0), 0);
    const calculatedOutstanding = customer.salesInvoices.reduce((sum, inv) => sum + Number(inv.balance || 0), 0);

    return {
      status: 'success',
      data: {
        id: customer.id,
        name: customer.name,
        phone: customer.phone,
        email: customer.email || 'N/A',
        address: customer.address || 'N/A',
        customerType: customer.customerType || 'Individual',
        totalPurchases: Number(calculatedTotal.toFixed(2)),
        outstandingBalance: Number(calculatedOutstanding.toFixed(2)),
        creditBalance: Number(calculatedOutstanding.toFixed(2)),
        transactionsCount: customer.salesInvoices.length,
        isOverdue: calculatedOutstanding > 0,
        createdAt: customer.createdAt,
        salesInvoices: customer.salesInvoices.map(inv => ({
          ...inv,
          totalAmount: Number(inv.totalAmount),
          balance: Number(inv.balance)
        }))
      }
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
    const newCredit = data.outstandingBalance ?? data.creditBalance ?? data.outstanding ?? data.outstanding_balance;
    
    const updateData: any = {
      name: data.name,
      phone: data.phone,
      email: data.email || null,
      address: data.address || null,
      customerType: data.customerType || 'Individual',
    };

    if (newCredit !== undefined && newCredit !== null) {
      updateData.outstandingBalance = Number(newCredit);
    }

    const customer = await this.prisma.customer.update({
      where: { id: customerId, tenantId },
      data: updateData,
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

