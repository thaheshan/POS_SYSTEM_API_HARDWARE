import { BadRequestException } from '@nestjs/common';
import { Prisma } from '@prisma/client';

export interface StockItem {
  product_id: string;
  quantity: number;
  warehouse_id: string;
  tenant_id: string;
}

export async function deductStockPerItem(
  tx: Prisma.TransactionClient,
  items: StockItem[],
  invoice_id: string,
): Promise<void> {
  for (const item of items) {
    const stock = await tx.stock.findUnique({
      where: {
        warehouse_id_product_id: {
          warehouse_id: item.warehouse_id,
          product_id: item.product_id,
        },
      },
    });

    if (!stock || stock.quantity < item.quantity) {
      throw new BadRequestException(
        `Insufficient stock for product ${item.product_id}`,
      );
    }

    await tx.stock.update({
      where: {
        warehouse_id_product_id: {
          warehouse_id: item.warehouse_id,
          product_id: item.product_id,
        },
      },
      data: { quantity: { decrement: item.quantity } },
    });

    await tx.stockMovement.create({
      data: {
        tenant_id: item.tenant_id,
        warehouse_id: item.warehouse_id,
        product_id: item.product_id,
        type: 'sale_out',
        quantity: item.quantity,
        reference_id: invoice_id,
      },
    });
  }
}