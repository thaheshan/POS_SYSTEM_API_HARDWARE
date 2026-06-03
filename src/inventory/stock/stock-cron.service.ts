import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from 'src/prisma/prisma.service';
import {
  SalesInvoiceStatus,
  SalesInvoice,
  SalesInvoiceItem,
} from '@prisma/client';

type InvoiceWithItems = SalesInvoice & {
  items: SalesInvoiceItem[];
};

@Injectable()
export class StockCronService {
  private readonly logger = new Logger(StockCronService.name);

  constructor(private readonly prisma: PrismaService) {}

  @Cron('0 */5 * * * *') // Every 5 minutes
  async releaseAbandonedReservations() {
    this.logger.log('CRON: Starting abandoned reservation cleanup...');

    const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000);

    try {
      const abandonedInvoices = (await this.prisma.salesInvoice.findMany({
        where: {
          status: SalesInvoiceStatus.pending,
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
        try {
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
              data: { status: SalesInvoiceStatus.cancelled },
            });

            this.logger.log(
              `CRON: Successfully released stock for Invoice ID: ${invoice.id}`,
            );
          });
        } catch (error) {
          this.logger.error(
            `CRON: Failed to release stock for Invoice ID: ${invoice.id}`,
            error,
          );
        }
      }

      this.logger.log('CRON: Abandoned reservation cleanup complete.');
    } catch (error) {
      this.logger.error('CRON: Failed to process abandoned invoices', error);
    }
  }
}
