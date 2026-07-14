import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCheckoutDto } from './dto/create-checkout.dto';

import { ActivityLogsService } from '../activity-logs/activity-logs.service';
import { SmsService } from '../sms/sms.service';

@Injectable()
export class SalesService {
  private readonly logger = new Logger(SalesService.name);

  constructor(
    private prisma: PrismaService,
    private readonly activityLogsService: ActivityLogsService,
    private readonly smsService: SmsService,
  ) {}

  async getSales(tenantId: string, query: any) {
    const limit = Number(query.limit) || 1000;
    const page = Number(query.page) || 1;
    const skip = (page - 1) * limit;

    // Build optional date range filter
    const dateFilter: any = {};
    if (query.startDate) {
      const start = new Date(query.startDate);
      start.setUTCHours(0, 0, 0, 0);
      dateFilter.gte = start;
    }
    if (query.endDate) {
      const end = new Date(query.endDate);
      end.setUTCHours(23, 59, 59, 999);
      dateFilter.lte = end;
    }

    const where: any = { tenantId };
    if (Object.keys(dateFilter).length > 0) {
      where.createdAt = dateFilter;
    }

    const [invoices, total] = await Promise.all([
      this.prisma.salesInvoice.findMany({
        where,
        include: {
          customer: { select: { name: true } },
        },
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip,
      }),
      this.prisma.salesInvoice.count({ where }),
    ]);

    return {
      status: 'success',
      data: {
        items: invoices.map((inv) => ({
          ...inv,
          totalAmount: Number(inv.totalAmount),
        })),
        total,
        page,
        limit,
      },
    };
  }

  async getSaleById(tenantId: string, id: string) {
    const isUuid =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        id,
      );

    const invoice = await this.prisma.salesInvoice.findFirst({
      where: {
        tenantId,
        ...(isUuid ? { id } : { invoiceNumber: id }),
      },
      include: {
        customer: { select: { name: true, phone: true } },
        items: {
          include: {
            product: { select: { name: true, sku: true, sellingPrice: true } },
          },
        },
      },
    });

    if (!invoice) {
      throw new BadRequestException('Invoice not found');
    }

    return {
      status: 'success',
      data: {
        ...invoice,
        totalAmount: Number(invoice.totalAmount),
        subtotal: Number(invoice.subtotal),
        discountAmount: Number(invoice.discountAmount),
        taxAmount: Number(invoice.taxAmount),
        items: (invoice as any).items.map((item: any) => ({
          ...item,
          quantity: Number(item.quantity),
          unitPrice: Number(item.unitPrice),
          lineTotal: Number(item.lineTotal),
          taxAmount: Number(item.taxAmount),
        })),
      },
    };
  }

  async updateSale(tenantId: string, id: string, data: any) {
    const isUuid =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        id,
      );
    const invoice = await this.prisma.salesInvoice.findFirst({
      where: {
        tenantId,
        ...(isUuid ? { id } : { invoiceNumber: id }),
      },
      include: { items: true },
    });

    if (!invoice) {
      throw new BadRequestException('Invoice not found');
    }

    return this.prisma.$transaction(async (tx) => {
      // 1. Update basic customer info if requested
      if (invoice.customerId && (data.customerName || data.customerPhone)) {
        await tx.customer.update({
          where: { id: invoice.customerId },
          data: {
            name:
              data.customerName !== undefined ? data.customerName : undefined,
            phone:
              data.customerPhone !== undefined ? data.customerPhone : undefined,
          },
        });
      }

      let newSubtotal = Number(invoice.subtotal);
      let newTax = Number(invoice.taxAmount ?? 0);

      // 2. If new items are provided, replace the old items
      if (data.items && Array.isArray(data.items)) {
        await tx.salesInvoiceItem.deleteMany({
          where: { invoiceId: invoice.id },
        });

        newSubtotal = 0;
        newTax = 0;
        const lineItems: any[] = [];

        for (const it of data.items) {
          const product = await tx.product.findFirst({
            where: { id: it.productId, tenantId },
          });

          if (!product) continue;

          const unitPrice = Number(it.unitPrice ?? product.sellingPrice);
          const qty = Number(it.quantity ?? 1);
          const lineTotal = unitPrice * qty;
          const taxRate = Number(product.taxRate ?? 0);

          // Tax Inclusive Calculation: Extract tax from the sticker price
          const basePrice = lineTotal / (1 + taxRate / 100);
          const taxAmount = lineTotal - basePrice;

          newSubtotal += lineTotal;
          newTax += taxAmount;

          const existingWarehouseId = (invoice as any).items?.[0]?.warehouseId;
          let warehouseId = existingWarehouseId;
          if (!warehouseId) {
            const wh = await tx.warehouse.findFirst({ where: { tenantId } });
            if (!wh) continue;
            warehouseId = wh.id;
          }

          const purchasePrice = Number(product.purchasePrice ?? 0);
          const costPriceTotal = purchasePrice * qty;
          const profit = lineTotal - costPriceTotal;

          lineItems.push({
            productId: it.productId,
            quantity: qty,
            unitPrice,
            lineTotal,
            taxRate,
            taxAmount,
            warehouseId,
            costPrice: purchasePrice,
            profit: profit,
          });
        }

        if (lineItems.length > 0) {
          await tx.salesInvoiceItem.createMany({
            data: lineItems.map((li: any) => ({
              ...li,
              invoiceId: invoice.id,
            })),
          });
        }
      }

      // 3. Update the main invoice record
      const discount =
        data.discount !== undefined
          ? Number(data.discount)
          : Number(invoice.discountAmount);
      // Total amount is simply Subtotal minus discount. Tax is already included inside the Subtotal.
      const totalAmount = newSubtotal - discount;

      await tx.salesInvoice.update({
        where: { id: invoice.id },
        data: {
          notes: data.notes ?? invoice.notes,
          discountAmount: discount,
          subtotal: newSubtotal,
          taxAmount: newTax,
          totalAmount: totalAmount,
        },
      });

      return {
        success: true,
        message: 'Invoice updated successfully',
      };
    });
  }

  async deleteSale(tenantId: string, id: string) {
    const isUuid =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        id,
      );
    const invoice = await this.prisma.salesInvoice.findFirst({
      where: {
        tenantId,
        ...(isUuid ? { id } : { invoiceNumber: id }),
      },
    });

    if (!invoice) {
      throw new BadRequestException('Invoice not found');
    }

    try {
      return await this.prisma.$transaction(async (tx) => {
        await tx.salesInvoiceItem.deleteMany({
          where: { invoiceId: invoice.id },
        });

        await tx.salesInvoice.delete({
          where: { id: invoice.id },
        });

        return {
          success: true,
          message: 'Invoice permanently deleted',
        };
      });
    } catch (error) {
      this.logger.error(`Failed to delete invoice ${invoice.id}:`, error);
      throw new BadRequestException(
        'Failed to delete invoice because of related records or database error. Check backend console.',
      );
    }
  }

  async checkout(dto: CreateCheckoutDto, tenantId: string, userId: string) {
    this.logger.log(
      `Processing POS checkout for tenant=${tenantId}, items=${dto.items.length}`,
    );

    let transactionResult: any;

    try {
      transactionResult = await this.prisma.$transaction(async (tx) => {
        // --- 1. Build invoice line items & validate stock ---
        let subtotal = 0;
        const lineItems: any[] = [];
        let resolvedBranchId: string | null = null;

        for (const item of dto.items) {
          const product = await tx.product.findFirst({
            where: { id: item.productId, tenantId },
          });
          if (!product) {
            throw new BadRequestException(
              `Product ${item.productId} not found`,
            );
          }

          const unitPrice = item.unitPrice ?? Number(product.sellingPrice);
          const lineTotal = unitPrice * item.quantity;
          subtotal += lineTotal;

          const stockRecord = await tx.stock.findFirst({
            where: {
              productId: item.productId,
              tenantId,
              ...(item.warehouseId ? { warehouseId: item.warehouseId } : {}),
            },
          });

          if (!stockRecord) {
            throw new BadRequestException(
              `No stock record found for product "${product.name}"`,
            );
          }

          if (!resolvedBranchId) {
            resolvedBranchId = stockRecord.branchId;
          }

          const available =
            Number(stockRecord.quantity) - Number(stockRecord.reservedQuantity);
          if (available < item.quantity) {
            throw new BadRequestException(
              `Insufficient stock for "${product.name}". Available: ${available}, Requested: ${item.quantity}`,
            );
          }

          // Deduct stock
          await tx.stock.update({
            where: { id: stockRecord.id },
            data: { quantity: { decrement: item.quantity } },
          });

          // Stock movement log
          await tx.stockMovement.create({
            data: {
              tenantId,
              productId: item.productId,
              warehouseId: stockRecord.warehouseId,
              movementType: 'OUT',
              quantity: -item.quantity,
              beforeQuantity: stockRecord.quantity,
              afterQuantity: Number(stockRecord.quantity) - item.quantity,
              referenceType: 'SALE',
              createdBy: userId,
            },
          });

          const purchasePrice = Number(product.purchasePrice ?? 0);
          const costPriceTotal = purchasePrice * item.quantity;
          const profit = lineTotal - costPriceTotal;

          const taxRate = Number(product.taxRate ?? 0);
          const basePrice = lineTotal / (1 + taxRate / 100);
          const taxAmount = lineTotal - basePrice;

          lineItems.push({
            productId: item.productId,
            quantity: item.quantity,
            unitPrice,
            lineTotal,
            taxRate,
            taxAmount,
            warehouseId: stockRecord.warehouseId,
            costPrice: purchasePrice,
            profit: profit,
          });
        }

        // Fallback branchId
        if (!resolvedBranchId) {
          const firstBranch = await tx.branch.findFirst({
            where: { tenantId },
          });
          if (!firstBranch) {
            throw new BadRequestException(
              'No branch found for this tenant. Please create a branch first.',
            );
          }
          resolvedBranchId = firstBranch.id;
        }

        this.logger.log(`Using branchId: ${resolvedBranchId}`);

        // --- 2. Calculate totals ---
        const discount = dto.discount ?? 0;
        const afterDiscount = subtotal - discount;
        const taxAmount = lineItems.reduce(
          (sum, li) => sum + Number(li.taxAmount),
          0,
        );

        // Total amount is simply Subtotal minus discount. Tax is already included inside the Subtotal.
        const totalAmount = afterDiscount;

        // --- 3. Create Sales Invoice ---
        const timestamp = Date.now().toString(); // Use full timestamp
        const randomPart = Math.floor(Math.random() * 10000)
          .toString()
          .padStart(4, '0');
        const invoiceNumber = `INV-${new Date().getFullYear()}-${timestamp}-${randomPart}`;
        const now = new Date();

        const invoice = await tx.salesInvoice.create({
          data: {
            tenantId,
            branchId: resolvedBranchId,
            customerId: dto.customerId ?? null,
            invoiceNumber,
            invoiceDate: now,
            invoiceTime: now,
            saleType: 'CASH',
            subtotal,
            discountAmount: discount,
            taxAmount,
            totalAmount,
            paymentStatus: 'PAID', // Or PARTIAL if we implement credit later
            status: 'COMPLETED',
            notes: dto.notes ?? null,
            cashierId: userId,
            items: {
              create: lineItems.map((li) => ({
                productId: li.productId,
                quantity: li.quantity,
                unitPrice: li.unitPrice,
                lineTotal: li.lineTotal,
                taxRate: li.taxRate,
                taxAmount: li.taxAmount,
                warehouseId: li.warehouseId,
                costPrice: li.costPrice ?? null,
                profit: li.profit ?? null,
              })),
            },
          },
          include: { items: true },
        });

        // --- Update Customer Totals ---
        if (dto.customerId) {
          const balanceAddition = Math.max(
            0,
            totalAmount - (dto.paidAmount ?? totalAmount),
          );
          await tx.customer.update({
            where: { id: dto.customerId },
            data: {
              totalPurchases: { increment: totalAmount },
              outstandingBalance: { increment: balanceAddition },
            },
          });
        }

        this.logger.log(`Invoice created: ${invoice.id}, total=${totalAmount}`);

        return {
          success: true,
          invoiceId: invoice.id,
          invoiceNumber,
          totalAmount,
          message: 'Checkout completed successfully',
        };
      });
    } catch (error) {
      this.logger.error('CHECKOUT FAILED:', error?.message || error);
      // Re-throw known business exceptions as-is; wrap unknown DB errors
      if (error instanceof BadRequestException) throw error;
      throw new BadRequestException(
        `Checkout failed: ${error?.message || 'Unknown database error. Check backend logs.'}`,
      );
    }

    // --- 4. Fire notification AFTER transaction (non-blocking, won't fail checkout) ---
    this.prisma.notification
      .create({
        data: {
          tenantId,
          userId,
          title: 'Sale Completed',
          message: `Invoice ${transactionResult.invoiceNumber} for LKR ${Number(transactionResult.totalAmount).toLocaleString()} was processed successfully.`,
          type: 'SUCCESS',
          link: '/sales',
        },
      })
      .catch((err) => {
        this.logger.warn('Failed to create sale notification: ' + err.message);
      });

    // Write Activity Log
    await this.activityLogsService.log(
      tenantId,
      userId,
      'CREATE_SALE',
      `Processed checkout for Invoice ${transactionResult.invoiceNumber}. Total: Rs. ${transactionResult.totalAmount}`,
    );

    // Send SMS Receipt (fire-and-forget — never blocks checkout)
    require('fs').appendFileSync(
      'sms-debug.txt',
      `\n[CHECKOUT END] dto.customerId: ${dto.customerId}\n`,
    );
    if (dto.customerId) {
      this.logger.log(
        `[SMS] Customer ID found (${dto.customerId}) — fetching phone for receipt SMS`,
      );
      this.prisma.customer
        .findUnique({ where: { id: dto.customerId } })
        .then((customer) => {
          require('fs').appendFileSync(
            'sms-debug.txt',
            `[DB FETCH] Customer found: ${!!customer}, Phone: ${customer?.phone}\n`,
          );
          if (customer?.phone) {
            this.logger.log(
              `[SMS] Phone found: ${customer.phone} — dispatching SMS`,
            );
            this.smsService.sendReceiptSMS(
              customer.phone,
              transactionResult.invoiceId,
            );
          } else {
            this.logger.warn(
              `[SMS] Customer ${dto.customerId} has no phone number — skipping SMS`,
            );
          }
        })
        .catch((err) =>
          this.logger.error('[SMS] Failed to fetch customer for SMS', err),
        );
    } else {
      this.logger.log('[SMS] No customerId in payload — skipping SMS');
    }

    return transactionResult;
  }
}
