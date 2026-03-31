import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from 'src/prisma/prisma.service';
import { InvoiceStatus, SalesInvoice, SalesInvoiceItem } from '@prisma/client';

type InvoiceWithItems = SalesInvoice & {
  items: SalesInvoiceItem[];
};

@Injectable()
export class StockCronService {
  private readonly logger = new Logger(StockCronService.name);

  constructor(private readonly prisma: PrismaService) {}

  @Cron(CronExpression.EVERY_5_MINUTES)
  async releaseAbandonedReservations() {
    this.logger.log('CRON: Starting abandoned reservation cleanup...');

    const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000);

    try {
      const abandonedInvoices = (await this.prisma.salesInvoice.findMany({
        where: {
          status: InvoiceStatus.PENDING,
          updatedAt: {
            lt: thirtyMinutesAgo,
          },
        },
        include: {
          items: true,
        },
      })) as InvoiceWithItems[];

      if (abandonedInvoices.length === 0) {
        this.logger.debug('CRON: No abandoned invoices found. All clean!');
        return;
      }

      this.logger.warn(
        `CRON: Found ${abandonedInvoices.length} abandoned invoices. Releasing stock...`,
      );

      for (const invoice of abandonedInvoices) {
        await this.prisma.$transaction(async (tx) => {
          for (const item of invoice.items) {
            await tx.stock.updateMany({
              where: {
                productId: item.productId,
                warehouseId: item.warehouseId,
                variantId: item.variantId,
              },
              data: {
                reservedQuantity: {
                  decrement: item.quantity,
                },
              },
            });
          }
          await tx.salesInvoice.update({
            where: { id: invoice.id },
            data: { status: InvoiceStatus.CANCELLED },
          });

          this.logger.log(
            `CRON: Successfully released stock for Invoice ID: ${invoice.id}`,
          );
        });
      }

      this.logger.log('CRON: Abandoned reservation cleanup complete.');
    } catch (error) {
      this.logger.error('CRON: Failed to process abandoned invoices', error);
    }
  }
}
