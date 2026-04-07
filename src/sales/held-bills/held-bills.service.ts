import {
  Injectable,
  NotFoundException,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateHeldBillDto } from './dto/create-held-bill.dto';

@Injectable()
export class HeldBillsService {
  private readonly logger = new Logger(HeldBillsService.name);

  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateHeldBillDto) {
  const expires_at = new Date(Date.now() + 30 * 60 * 1000);

  try {
    return await this.prisma.$transaction(async (tx) => {
      // 1. Held bill create
      const heldBill = await tx.heldBill.create({
        data: {
          cashierId: dto.cashier_id,
          warehouseId: dto.warehouse_id,
          cartItems: dto.cart_items,
          reservedStock: dto.reserved_stock || {},
          expiresAt: expires_at,
        },
      });

      // 2. Stock reserve
      if (dto.warehouse_id && dto.cart_items?.length > 0) {
        for (const item of dto.cart_items) {
          await tx.stock.update({
            where: {
              warehouseId_productId: {
                warehouseId: dto.warehouse_id,
                productId: item.product_id,
              },
            },
            data: {
              reservedQuantity: { increment: item.quantity },
            },
          });
        }
      }

      return heldBill;
    });
  } catch (error) {
    this.logger.error('Failed to create held bill', error);
    throw new InternalServerErrorException('Failed to hold bill');
  }
}

  async findByCashier(cashier_id: string) {
    return this.prisma.heldBill.findMany({
      where: {
        cashierId: cashier_id,
        expiresAt: { gt: new Date() },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

// DELETE /sales/held-bills/:id — stock release
async remove(id: string) {
  const bill = await this.prisma.heldBill.findUnique({ where: { id } });
  if (!bill) throw new NotFoundException('Held bill not found');

  try {
    return await this.prisma.$transaction(async (tx) => {
      // 1. Reserved stock release
      const cartItems = bill.cartItems as any[];
      const reservedStock = bill.reservedStock as any;

      if (cartItems?.length > 0 && reservedStock && bill.warehouseId) {
        for (const item of cartItems) {
          await tx.stock.update({
            where: {
              warehouseId_productId: {
                warehouseId: bill.warehouseId,
                productId: item.product_id,
              },
            },
            data: {
              reservedQuantity: { decrement: item.quantity },
            },
          });
        }
      }

      // 2. Held bill delete
      await tx.heldBill.delete({ where: { id } });

      return { message: 'Held bill discarded and stock released successfully' };
    });
  } catch (error) {
    this.logger.error('Failed to discard held bill', error);
    throw new InternalServerErrorException('Failed to discard held bill');
  }
}
}