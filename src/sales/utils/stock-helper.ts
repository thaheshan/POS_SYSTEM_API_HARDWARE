import { BadRequestException } from '@nestjs/common';

export interface StockItem {
  product_id: string;
  quantity: number;
  warehouse_id: string;
  tenant_id: string;
}

export async function deductStockPerItem(
  tx: any,
  items: StockItem[],
  invoice_id: string,
): Promise<void> {
  for (const item of items) {
    const stock = await tx.stock.findUnique({
      where: {
        warehouseId_productId: {
          warehouseId: item.warehouse_id,
          productId: item.product_id,
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
        warehouseId_productId: {
          warehouseId: item.warehouse_id,
          productId: item.product_id,
        },
      },
      data: { quantity: { decrement: item.quantity } },
    });

    await tx.stockMovement.create({
      data: {
        tenantId: item.tenant_id,
        warehouseId: item.warehouse_id,
        productId: item.product_id,
        type: 'sale_out',
        quantity: item.quantity,
        referenceId: invoice_id,
      },
    });
  }
}