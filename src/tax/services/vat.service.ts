import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class VatService {
  constructor(private readonly prisma: PrismaService) {}

  // Output VAT — sales invoices table
  async calcOutputVat(tenantId: string, from: Date, to: Date): Promise<number> {
    const result = await this.prisma.salesInvoiceItem.aggregate({
      where: {
        taxCategory: 'standard_vat',
        invoice: {
          tenantId,
          createdAt: { gte: from, lte: to },
        },
      },
      _sum: { lineTax: true },
    });
    return result._sum.lineTax || 0;
  }

  // Monthly VAT breakdown
  async getMonthlyVat(tenantId: string, year: number) {
    const months: {
  month: string;
  year: number;
  outputVat: number;
  inputVat: number;
  netVatPayable: number;
}[] = [];

    for (let month = 0; month < 12; month++) {
      const from = new Date(year, month, 1);
      const to = new Date(year, month + 1, 0, 23, 59, 59);

      const outputVat = await this.calcOutputVat(tenantId, from, to);

      // Input VAT — daily_tax_tracking table
      const tracking = await this.prisma.dailyTaxTracking.aggregate({
        where: {
          tenantId,
          date: { gte: from, lte: to },
        },
        _sum: {
          inputVat: true,
          outputVat: true,
          netVatPayable: true,
        },
      });

      months.push({
        month: from.toLocaleString('default', { month: 'long' }),
        year,
        outputVat: tracking._sum.outputVat || outputVat,
        inputVat: tracking._sum.inputVat || 0,
        netVatPayable: tracking._sum.netVatPayable || outputVat,
      });
    }

    return months;
  }

  // Input VAT from GRN
  async getInputVatFromGrn(tenantId: string, from: Date, to: Date): Promise<number> {
    const result = await this.prisma.goodsReceivedNote.aggregate({
      where: {
        tenantId,
        receivedDate: { gte: from, lte: to },
        status: 'completed',
      },
      _sum: { taxAmount: true },
    });
    return result._sum.taxAmount || 0;
  }
}