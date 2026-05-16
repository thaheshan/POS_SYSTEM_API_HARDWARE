import { BadRequestException } from '@nestjs/common';

export class InsufficientStockException extends BadRequestException {
  constructor(available: number, requested: number) {
    super(
      `Insufficient stock. Available: ${available}, Requested: ${requested}`,
    );
  }
}
