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
          items: {
            select: {
              quantity: true,
              unitPrice: true,
              costPrice: true,
              lineTotal: true,
              product: { select: { purchasePrice: true } },
            },
          },
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

  async updateSale(tenantId: string, id: string, data: any, userId?: string) {
    const isUuid =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        id,
      );
    const invoice = await this.prisma.salesInvoice.findFirst({
      where: {
        tenantId,
        ...(isUuid ? { id } : { invoiceNumber: id }),
      },
      include: { items: true, customer: true },
    });

    if (!invoice) {
      throw new BadRequestException('Invoice not found');
    }

    const oldTotalAmount = Number(invoice.totalAmount);
    const oldBalance = Number(invoice.balance);

    const result = await this.prisma.$transaction(async (tx) => {
      // 1. Customer details update or auto-link
      let targetCustomerId = invoice.customerId;

      if (targetCustomerId) {
        if (data.customerName || data.customerPhone || data.customerEmail) {
          await tx.customer.update({
            where: { id: targetCustomerId },
            data: {
              name:
                data.customerName !== undefined && data.customerName !== ''
                  ? data.customerName
                  : undefined,
              phone:
                data.customerPhone !== undefined && data.customerPhone !== ''
                  ? data.customerPhone
                  : undefined,
              email:
                data.customerEmail !== undefined && data.customerEmail !== ''
                  ? data.customerEmail
                  : undefined,
            },
          });
        }
      } else if (data.customerName || data.customerPhone) {
        // Try linking an existing customer or creating a new one
        const cPhone = data.customerPhone?.trim();
        let foundCustomer = cPhone
          ? await tx.customer.findFirst({ where: { tenantId, phone: cPhone } })
          : null;

        if (!foundCustomer && data.customerName?.trim()) {
          foundCustomer = await tx.customer.create({
            data: {
              tenantId,
              name: data.customerName.trim(),
              phone: cPhone || '—',
              email: data.customerEmail?.trim() || null,
            },
          });
        }

        if (foundCustomer) {
          targetCustomerId = foundCustomer.id;
        }
      }

      let newSubtotal = Number(invoice.subtotal);
      let newTax = Number(invoice.taxAmount ?? 0);

      // 2. If new items are provided, perform stock reversion & re-deduction
      if (data.items && Array.isArray(data.items)) {
        // A. Revert stock for all existing items on this invoice
        for (const oldItem of invoice.items) {
          const oldQty = Number(oldItem.quantity);
          if (oldQty <= 0) continue;

          const stockRecord = await tx.stock.findFirst({
            where: {
              productId: oldItem.productId,
              tenantId,
              warehouseId: oldItem.warehouseId,
            },
          });

          if (stockRecord) {
            await tx.stock.update({
              where: { id: stockRecord.id },
              data: {
                quantity: { increment: oldQty },
                availableQuantity: { increment: oldQty },
              },
            });

            await tx.stockMovement.create({
              data: {
                tenantId,
                productId: oldItem.productId,
                warehouseId: oldItem.warehouseId,
                movementType: 'IN',
                quantity: oldQty,
                beforeQuantity: stockRecord.quantity,
                afterQuantity: Number(stockRecord.quantity) + oldQty,
                referenceType: 'INVOICE_EDIT_REVERSAL',
                referenceId: invoice.id,
                createdBy: userId || null,
                notes: `Stock reverted for invoice edit ${invoice.invoiceNumber}`,
              },
            });
          }
        }

        // B. Delete old invoice line items
        await tx.salesInvoiceItem.deleteMany({
          where: { invoiceId: invoice.id },
        });

        // C. Process new items and deduct stock
        newSubtotal = 0;
        newTax = 0;
        const lineItems: any[] = [];

        for (const it of data.items) {
          // Resolve product (support ID or name/SKU lookup)
          let product: any = null;
          if (
            it.productId &&
            /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
              it.productId,
            )
          ) {
            product = await tx.product.findFirst({
              where: { id: it.productId, tenantId },
            });
          }
          if (!product && it.productName) {
            product = await tx.product.findFirst({
              where: {
                tenantId,
                OR: [
                  { name: { equals: it.productName, mode: 'insensitive' } },
                  {
                    sku: {
                      equals: it.sku || it.productName,
                      mode: 'insensitive',
                    },
                  },
                ],
              },
            });
          }

          if (!product) {
            this.logger.warn(
              `Product not found for item: ${it.productName || it.productId}`,
            );
            continue;
          }

          const unitPrice = Number(it.unitPrice ?? product.sellingPrice);
          const qty = Number(it.quantity ?? it.qty ?? 1);
          if (qty <= 0) continue;

          const itemDiscount = Number(it.discountAmount ?? it.discount ?? 0);
          const grossLineTotal = Number((unitPrice * qty).toFixed(2));
          const lineTotal = Math.max(0, Number((grossLineTotal - itemDiscount).toFixed(2)));
          const taxRate = Number(product.taxRate ?? 0);
          const basePrice = Number((lineTotal / (1 + taxRate / 100)).toFixed(2));
          const taxAmount = Number((lineTotal - basePrice).toFixed(2));

          newSubtotal = Number((newSubtotal + lineTotal).toFixed(2));
          newTax = Number((newTax + taxAmount).toFixed(2));

          // Resolve stock & warehouse
          let stockRecord = await tx.stock.findFirst({
            where: {
              productId: product.id,
              tenantId,
              ...(it.warehouseId ? { warehouseId: it.warehouseId } : {}),
            },
          });

          if (!stockRecord) {
            stockRecord = await tx.stock.findFirst({
              where: { productId: product.id, tenantId },
            });
          }

          let warehouseId =
            stockRecord?.warehouseId || (invoice as any).items?.[0]?.warehouseId;
          if (!warehouseId) {
            const wh = await tx.warehouse.findFirst({ where: { tenantId } });
            if (wh) warehouseId = wh.id;
          }

          if (stockRecord) {
            const available =
              stockRecord.availableQuantity != null
                ? Number(stockRecord.availableQuantity)
                : Number(stockRecord.quantity) -
                  Number(stockRecord.reservedQuantity);

            if (available < qty) {
              throw new BadRequestException(
                `Insufficient stock for "${product.name}". Available: ${available}, Requested: ${qty}`,
              );
            }

            // Deduct stock
            await tx.stock.update({
              where: { id: stockRecord.id },
              data: {
                quantity: { decrement: qty },
                availableQuantity: { decrement: qty },
              },
            });

            await tx.stockMovement.create({
              data: {
                tenantId,
                productId: product.id,
                warehouseId: stockRecord.warehouseId,
                movementType: 'OUT',
                quantity: -qty,
                beforeQuantity: stockRecord.quantity,
                afterQuantity: Number(stockRecord.quantity) - qty,
                referenceType: 'INVOICE_EDIT',
                referenceId: invoice.id,
                createdBy: userId || null,
                notes: `Deducted stock for invoice edit ${invoice.invoiceNumber}`,
              },
            });
          }

          const purchasePrice = Number(product.purchasePrice ?? 0);
          const costPriceTotal = Number((purchasePrice * qty).toFixed(2));
          const profit = Number((lineTotal - costPriceTotal).toFixed(2));

          lineItems.push({
            productId: product.id,
            productName: product.name,
            quantity: qty,
            unitPrice,
            discountAmount: itemDiscount,
            lineTotal,
            taxRate,
            taxAmount,
            warehouseId: warehouseId || stockRecord?.warehouseId,
            costPrice: purchasePrice,
            profit,
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

      // 3. Recalculate main invoice record
      const discount =
        data.discount !== undefined
          ? Number(data.discount)
          : data.discountAmount !== undefined
          ? Number(data.discountAmount)
          : Number(invoice.discountAmount || 0);
      const totalAmount = Number((newSubtotal - discount).toFixed(2));
      if (totalAmount < 0) {
        throw new BadRequestException('Invoice total cannot be negative');
      }

      const totalDelta = totalAmount - oldTotalAmount;
      const newPaidAmount = Number(invoice.paidAmount);
      const newBalance = Math.max(0, totalAmount - newPaidAmount);
      const balanceDelta = newBalance - oldBalance;
      const paymentStatus =
        newBalance <= 0 ? 'PAID' : newPaidAmount > 0 ? 'PARTIAL' : 'UNPAID';

      await tx.salesInvoice.update({
        where: { id: invoice.id },
        data: {
          customerId: targetCustomerId,
          notes: data.notes !== undefined ? data.notes : invoice.notes,
          discountAmount: discount,
          subtotal: newSubtotal,
          taxAmount: newTax,
          totalAmount: totalAmount,
          balance: newBalance,
          paymentStatus: paymentStatus as any,
        },
      });

      // 4. Update customer aggregate purchases and balance if linked
      if (targetCustomerId) {
        await tx.customer.update({
          where: { id: targetCustomerId },
          data: {
            totalPurchases: { increment: totalDelta },
            outstandingBalance: { increment: balanceDelta },
          },
        });
      }

      return {
        success: true,
        invoiceId: invoice.id,
        invoiceNumber: invoice.invoiceNumber,
        totalAmount,
        message: 'Invoice updated successfully',
      };
    }, {
      maxWait: 15000,
      timeout: 30000,
    });

    // Fire activity log
    if (userId) {
      await this.activityLogsService
        .log(
          tenantId,
          userId,
          'UPDATE_SALE',
          `Updated Invoice ${result.invoiceNumber}. New Total: Rs. ${result.totalAmount}`,
        )
        .catch(() => {});
    }

    return result;
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
          if (unitPrice < 0) {
            throw new BadRequestException(
              `Unit price cannot be negative for product "${product.name}"`,
            );
          }

          // Enforce backend validation of discount limit
          const regularPrice = Number(product.sellingPrice);
          const appliedDiscount = regularPrice - unitPrice;

          if (appliedDiscount > 0.01) {
            if (!product.isDiscountEnabled || !product.isDiscountApproved) {
              throw new BadRequestException(
                `Discounts are not enabled or approved for product "${product.name}"`,
              );
            }

            let maxAllowedAmount = 0;
            const maxAllowedDiscount = Number(product.maxAllowedDiscount ?? 0);
            const isPercentage =
              !product.discountType ||
              String(product.discountType).toUpperCase() === 'PERCENTAGE' ||
              String(product.discountType).toUpperCase() === 'PERCENT';

            if (isPercentage) {
              maxAllowedAmount = (regularPrice * maxAllowedDiscount) / 100;
            } else {
              maxAllowedAmount = maxAllowedDiscount;
            }

            if (appliedDiscount - maxAllowedAmount > 0.01) {
              const formattedLimit = isPercentage
                ? `${maxAllowedDiscount}% (Rs. ${maxAllowedAmount.toFixed(2)})`
                : `Rs. ${maxAllowedDiscount}`;
              throw new BadRequestException(
                `Applied discount of Rs. ${appliedDiscount.toFixed(2)} on product "${product.name}" exceeds the maximum allowed limit of ${formattedLimit}`,
              );
            }
          }

          const lineTotal = Number((unitPrice * item.quantity).toFixed(2));
          subtotal = Number((subtotal + lineTotal).toFixed(2));

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

          // Use availableQuantity if it is set (explicit field), otherwise fall back to quantity - reservedQuantity
          const available =
            stockRecord.availableQuantity != null
              ? Number(stockRecord.availableQuantity)
              : Number(stockRecord.quantity) - Number(stockRecord.reservedQuantity);
          if (available < item.quantity) {
            throw new BadRequestException(
              `Insufficient stock for "${product.name}". Available: ${available}, Requested: ${item.quantity}`,
            );
          }

          // Deduct stock — keep both quantity and availableQuantity in sync
          await tx.stock.update({
            where: { id: stockRecord.id },
            data: {
              quantity: { decrement: item.quantity },
              availableQuantity: { decrement: item.quantity },
            },
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
          const costPriceTotal = Number(
            (purchasePrice * item.quantity).toFixed(2),
          );
          const profit = Number((lineTotal - costPriceTotal).toFixed(2));

          const taxRate = Number(product.taxRate ?? 0);
          const basePrice = Number(
            (lineTotal / (1 + taxRate / 100)).toFixed(2),
          );
          const taxAmount = Number((lineTotal - basePrice).toFixed(2));

          lineItems.push({
            productId: item.productId,
            quantity: item.quantity,
            unitPrice,
            discountAmount: appliedDiscount > 0 ? appliedDiscount : 0,
            discountPercentage: appliedDiscount > 0 ? Number(((appliedDiscount / regularPrice) * 100).toFixed(2)) : 0,
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
        const totalAmount = Number((subtotal - discount).toFixed(2));
        if (totalAmount < 0) {
          throw new BadRequestException(
            `Grand total after discounts cannot be negative (calculated total: Rs. ${totalAmount})`,
          );
        }
        const taxAmount = Number(
          lineItems
            .reduce((sum, li) => sum + Number(li.taxAmount), 0)
            .toFixed(2),
        );

        // --- 3. Create Sales Invoice ---
        const timestamp = Date.now().toString(); // Use full timestamp
        const randomPart = Math.floor(Math.random() * 10000)
          .toString()
          .padStart(4, '0');
        const invoiceNumber = `INV-${new Date().getFullYear()}-${timestamp}-${randomPart}`;
        const now = new Date();

        const isCreditSale = (dto.paymentMethod || '').toUpperCase() === 'CREDIT' || (dto.paidAmount !== undefined && dto.paidAmount < totalAmount);
        const paidAmount = dto.paidAmount ?? (isCreditSale ? 0 : totalAmount);
        const balanceAddition = Math.max(0, totalAmount - paidAmount);
        const changeAmount = isCreditSale ? 0 : Number(dto.change || 0);
        const paymentStatus = balanceAddition <= 0 ? 'PAID' : (paidAmount > 0 ? 'PARTIAL' : 'UNPAID');
        const saleTypeVal = isCreditSale ? 'CREDIT' : 'CASH';

        const isValidUuid = (val: any) =>
          typeof val === 'string' &&
          /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(val.trim());

        const validCustomerId = isValidUuid(dto.customerId) ? String(dto.customerId).trim() : null;

        const invoice = await tx.salesInvoice.create({
          data: {
            tenantId,
            branchId: resolvedBranchId,
            customerId: validCustomerId,
            invoiceNumber,
            invoiceDate: now,
            invoiceTime: now,
            saleType: saleTypeVal as any,
            subtotal,
            discountAmount: discount,
            taxAmount,
            totalAmount,
            paidAmount,
            changeAmount,
            balance: balanceAddition,
            paymentStatus: paymentStatus as any,
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
        if (validCustomerId) {
          const existingCustomer = await tx.customer.findUnique({
            where: { id: validCustomerId },
          });
          if (existingCustomer) {
            await tx.customer.update({
              where: { id: validCustomerId },
              data: {
                totalPurchases: { increment: totalAmount },
                outstandingBalance: { increment: balanceAddition },
              },
            });
          }
        }

        this.logger.log(`Invoice created: ${invoice.id}, total=${totalAmount}`);

        return {
          success: true,
          invoiceId: invoice.id,
          invoiceNumber,
          totalAmount,
          message: 'Checkout completed successfully',
        };
      }, {
        maxWait: 15000,
        timeout: 30000,
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
