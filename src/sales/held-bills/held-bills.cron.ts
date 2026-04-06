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
        where: {
          expiresAt: { lt: new Date() },
        },
      });

      if (expiredBills.length === 0) {
        this.logger.log('No expired held bills found');
        return;
      }

      
      const deleted = await this.prisma.heldBill.deleteMany({
        where: {
          expiresAt: { lt: new Date() },
        },
      });

      this.logger.log(
        `Released ${deleted.count} expired held bill(s)`,
      );
    } catch (error) {
      this.logger.error('Failed to release expired held bills', error);
    }
  }
}