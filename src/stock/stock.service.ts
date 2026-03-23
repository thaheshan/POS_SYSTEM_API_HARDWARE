/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-return */
import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class StockService {
  constructor(private readonly prisma: PrismaService) {}

  async createInitialStockForVariants(
    tx: Prisma.TransactionClient,
    params: {
      tenantId: string;
      productId: string;
      variantIds: string[];
      branchId?: string;
    },
  ) {
    if (!params.variantIds.length) {
      return;
    }
    await tx.stock.createMany({
      data: params.variantIds.map((variantId) => ({
        tenantId: params.tenantId,
        productId: params.productId,
        variantId,
        branchId: params.branchId,
        quantity: new Prisma.Decimal(0),
        reservedQuantity: new Prisma.Decimal(0),
      })),
    });
  }

  async createInitialStockForProduct(
    tx: Prisma.TransactionClient,
    params: {
      tenantId: string;
      productId: string;
      branchId?: string;
    },
  ) {
    await tx.stock.create({
      data: {
        tenantId: params.tenantId,
        productId: params.productId,
        branchId: params.branchId,
        quantity: new Prisma.Decimal(0),
        reservedQuantity: new Prisma.Decimal(0),
      },
    });
  }

  getStockSummaryByProduct(tenantId: string) {
    return this.prisma.stock.groupBy({
      by: ['productId'],
      where: { tenantId },
      orderBy: { productId: 'asc' },
      _sum: { quantity: true, reservedQuantity: true },
    });
  }

  getStockSummaryByVariant(tenantId: string, variantId: string) {
    return this.prisma.stock.aggregate({
      where: { tenantId, variantId },
      _sum: { quantity: true, reservedQuantity: true },
    });
  }

  getStockSummaryByProductNoVariant(tenantId: string, productId: string) {
    return this.prisma.stock.aggregate({
      where: { tenantId, productId, variantId: null },
      _sum: { quantity: true, reservedQuantity: true },
    });
  }
}
