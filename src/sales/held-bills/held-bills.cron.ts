import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class HeldBillsCron {
  private readonly logger = new Logger(HeldBillsCron.name);

  constructor(private readonly prisma: PrismaService) {}


@Cron(CronExpression.EVERY_5_MINUTES)
async releaseExpiredHeldBills(): Promise<void> {
  this.logger.log('Checking for expired held bills...');

  try {
    const expiredBills = await this.prisma.heldBill.findMany({
      where: { expiresAt: { lt: new Date() } },
    });

    if (expiredBills.length === 0) {
      this.logger.log('No expired held bills found');
      return;
    }

    for (const bill of expiredBills) {
      const cartItems = bill.cartItems as any[];

      if (cartItems?.length > 0 && bill.warehouseId) {
        for (const item of cartItems) {
          await this.prisma.stock.update({
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
    }

    // Delete expired bills
    const deleted = await this.prisma.heldBill.deleteMany({
      where: { expiresAt: { lt: new Date() } },
    });

    this.logger.log(`Released ${deleted.count} expired held bill(s) and restored stock`);
  } catch (error) {
    this.logger.error('Failed to release expired held bills', error);
  }
}
}