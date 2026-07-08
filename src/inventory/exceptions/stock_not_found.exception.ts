import { NotFoundException } from '@nestjs/common';

export class StockNotFoundException extends NotFoundException {
  constructor(productId: string, warehouseId: string) {
    super(
      `Stock not found for product ${productId} in warehouse ${warehouseId}`,
    );
  }
}
