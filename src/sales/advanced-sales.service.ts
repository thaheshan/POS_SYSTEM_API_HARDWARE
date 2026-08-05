import { Injectable, BadRequestException, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  CreateReturnDto,
  CreateQuotationDto,
  CreateCreditSaleDto,
  CreateBulkSaleDto,
  CreateHoldSaleDto,
  CreateExchangeDto,
  CreateLayawayDto,
} from './dto/advanced-sales.dto';

import { ActivityLogsService } from '../activity-logs/activity-logs.service';
import { SmsService } from '../sms/sms.service';

@Injectable()
export class AdvancedSalesService {
  private readonly logger = new Logger(AdvancedSalesService.name);

  constructor(
    private prisma: PrismaService,
    private readonly activityLogsService: ActivityLogsService,
    private readonly smsService: SmsService,
  ) {}

  // ─── Helpers ────────────────────────────────────────────────────────────────
  private isUuid(id: string) {
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
  }

  private makeNumber(prefix: string) {
    const ts = Date.now().toString();
    const rnd = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
    return `${prefix}-${new Date().getFullYear()}-${ts}-${rnd}`;
  }

  // ─── PROCESS RETURN ──────────────────────────────────────────────────────────
  async processReturn(dto: CreateReturnDto, tenantId: string, userId: string) {
    this.logger.log(`Processing return for invoice=${dto.invoiceId}, tenant=${tenantId}`);

    // Resolve invoice by UUID or invoiceNumber
    const invoice = await this.prisma.salesInvoice.findFirst({
      where: {
        tenantId,
        ...(this.isUuid(dto.invoiceId) ? { id: dto.invoiceId } : { invoiceNumber: dto.invoiceId }),
      },
      include: { items: true },
    });

    if (!invoice) throw new BadRequestException('Invoice not found or does not belong to this tenant.');
    if (invoice.status === 'RETURNED') throw new BadRequestException('This invoice has already been fully returned.');

    const refundMethod = (['CASH', 'CREDIT_NOTE', 'EXCHANGE', 'ACCOUNT_DEDUCTION'].includes(dto.refundMethod?.toUpperCase())
      ? dto.refundMethod.toUpperCase()
      : 'CASH') as any;

    const result = await this.prisma.$transaction(async (tx) => {
      const retNumber = this.makeNumber('RET');
      // 1. Build return items, validate quantities, and restore stock
      const returnItems: any[] = [];
      let totalRefund = 0;
      let totalTaxRefund = 0;

      for (const item of dto.items) {
        const invoiceItem = invoice.items.find((i: any) => i.productId === item.productId);
        if (!invoiceItem) throw new BadRequestException(`Product ${item.productId} not found on original invoice.`);

        const qty = Number(item.quantity);
        const originalQty = Number(invoiceItem.quantity);

        if (qty > originalQty) {
          throw new BadRequestException(`Cannot return more than available on invoice. Requested: ${qty}, Available: ${originalQty}`);
        }

        const unitPrice = Number(item.price) || Number(invoiceItem.unitPrice);

        // Under Tax Inclusive pricing, the unitPrice already includes the tax.
        // Therefore, the total refund for this line is exactly unitPrice * qty.
        const lineTotal = unitPrice * qty;
        totalRefund += lineTotal;

        // Extract the tax portion strictly for the contra invoice (accounting purposes)
        const taxRate = Number(invoiceItem.taxRate) || 0;
        const basePrice = lineTotal / (1 + (taxRate / 100));
        const lineTaxAmount = lineTotal - basePrice;
        totalTaxRefund += lineTaxAmount;

        const condition = (item.condition && ['GOOD', 'DAMAGED', 'EXPIRED'].includes(item.condition.toUpperCase())
          ? item.condition.toUpperCase()
          : 'GOOD') as any;

        // Restore stock
        let stockRecord = item.warehouseId 
          ? await tx.stock.findFirst({ where: { productId: item.productId, warehouseId: item.warehouseId, tenantId } })
          : null;
        
        if (!stockRecord) {
          stockRecord = await tx.stock.findFirst({ where: { productId: item.productId, tenantId } });
        }

        if (!stockRecord) {
          const product = await tx.product.findFirst({ where: { id: item.productId, tenantId } });
          throw new BadRequestException(`Stock record not found for product "${product?.name || item.productId}"`);
        }

        const resolvedWarehouseId = stockRecord.warehouseId;

        await tx.stock.update({
          where: { id: stockRecord.id },
          data: { quantity: { increment: qty } },
        });

        // Stock movement for return
        await tx.stockMovement.create({
          data: {
            tenantId,
            productId: item.productId,
            warehouseId: resolvedWarehouseId,
            movementType: 'RETURN',
            quantity: qty,
            beforeQuantity: stockRecord.quantity,
            afterQuantity: Number(stockRecord.quantity) + qty,
            referenceType: 'RETURN',
            createdBy: userId,
          },
        });

        returnItems.push({
          invoiceItemId: invoiceItem.id,
          productId: item.productId,
          warehouseId: resolvedWarehouseId,
          quantity: qty,
          condition,
          unitPrice,
          lineTotal,
          taxRate,
          lineTaxAmount,
          costPrice: invoiceItem.costPrice ? Number(invoiceItem.costPrice) : 0,
        });

        // Mutate original invoice item
        const newQty = originalQty - qty;
        const newTotal = newQty * unitPrice;
        await tx.salesInvoiceItem.update({
          where: { id: invoiceItem.id },
          data: {
            quantity: newQty,
            lineTotal: newTotal,
            taxAmount: newTotal - (newTotal / (1 + (taxRate / 100))),
            profit: newTotal - (Number(invoiceItem.costPrice || 0) * newQty),
          },
        });
      }

      // Check if original invoice is now fully returned (sum of item quantities is 0)
      const updatedItems = await tx.salesInvoiceItem.findMany({
        where: { invoiceId: invoice.id },
      });
      const remainingQty = updatedItems.reduce((sum, item) => sum + Number(item.quantity), 0);

      if (remainingQty <= 0) {
        await tx.salesInvoice.update({
          where: { id: invoice.id },
          data: { status: 'RETURNED' },
        });
      }

      // 3. Create the SalesReturn record
      const salesReturn = await tx.salesReturn.create({
        data: {
          tenantId,
          retNumber,
          branchId: invoice.branchId,
          invoiceId: invoice.id,
          customerId: invoice.customerId ?? undefined,
          totalAmount: totalRefund,
          refundMethod,
          reason: dto.reason,
          createdBy: userId,
          items: {
            createMany: {
              data: returnItems.map(item => ({
                invoiceItemId: item.invoiceItemId,
                productId: item.productId,
                warehouseId: item.warehouseId,
                quantity: item.quantity,
                condition: item.condition,
                unitPrice: item.unitPrice,
                lineTotal: item.lineTotal,
              })),
            }
          },
        },
        include: { items: true },
      });

      // 4. Create a Return Invoice (negative) so the return appears in the invoice list
      await tx.salesInvoice.create({
        data: {
          tenantId,
          branchId: invoice.branchId,
          customerId: invoice.customerId ?? undefined,
          invoiceNumber: retNumber,
          invoiceDate: new Date(),
          invoiceTime: new Date(),
          saleType: 'CASH',
          subtotal: -totalRefund,
          discountAmount: 0,
          taxAmount: -totalTaxRefund,
          totalAmount: -totalRefund,
          paidAmount: -totalRefund,
          balance: 0,
          paymentStatus: 'PAID',
          status: 'COMPLETED',
          notes: `RETURN | Ref: ${invoice.invoiceNumber} | Reason: ${dto.reason}`,
          cashierId: userId,
        },
      });

      // 5. Create a notification
      await tx.notification.create({
        data: {
          tenantId,
          userId,
          title: 'Return Processed',
          message: `Return ${retNumber} for Rs. ${totalRefund.toLocaleString()} has been processed and original invoice adjusted.`,
          type: 'WARNING',
          link: '/pos/return',
        },
      });

      return {
        success: true,
        returnId: salesReturn.id,
        returnNumber: retNumber,
        totalRefund,
        message: 'Return processed and stock restored successfully.',
      };
    });

    await this.activityLogsService.log(
      tenantId,
      userId,
      'RETURN_SALE',
      `Processed return ${result.returnNumber} for Invoice ${invoice.invoiceNumber}. Reason: ${dto.reason}`,
      result.totalRefund,
    );

    if (invoice.customerId) {
      this.prisma.customer.findUnique({ where: { id: invoice.customerId } })
        .then(customer => {
          if (customer?.phone) {
            this.smsService.sendReceiptSMS(customer.phone, invoice.id);
          }
        })
        .catch(err => this.logger.error('Failed to fetch customer for SMS', err));
    }

    return result;
  }

  // ─── INVOICE LOOKUP (for return/exchange) ───────────────────────────────────
  async getInvoiceForReturn(invoiceId: string, tenantId: string) {
    const invoice = await this.prisma.salesInvoice.findFirst({
      where: {
        tenantId,
        status: { not: 'CANCELLED' },
        ...(this.isUuid(invoiceId) ? { id: invoiceId } : { invoiceNumber: invoiceId }),
      },
      include: {
        customer: { select: { name: true, phone: true } },
        items: {
          include: {
            product: { select: { name: true, sku: true } },
            warehouse: { select: { id: true, name: true } },
          },
        },
      },
    });

    if (!invoice) throw new NotFoundException('Invoice not found or not eligible for return.');

    return {
      success: true,
      data: {
        id: invoice.id,
        invoiceNumber: invoice.invoiceNumber,
        status: invoice.status,
        totalAmount: Number(invoice.totalAmount),
        createdAt: invoice.createdAt,
        customer: invoice.customer,
        items: (invoice as any).items.map((item: any) => ({
          id: item.id,
          productId: item.productId,
          warehouseId: item.warehouseId,
          name: item.product?.name || 'Unknown',
          sku: item.product?.sku || 'N/A',
          quantity: Number(item.quantity),
          unitPrice: Number(item.unitPrice),
          lineTotal: Number(item.lineTotal),
        })),
      },
    };
  }

  // ─── CREATE QUOTATION ────────────────────────────────────────────────────────
  async createQuotation(dto: CreateQuotationDto, tenantId: string, userId: string) {
    this.logger.log(`Creating quotation for ${dto.customerName}, tenant=${tenantId}`);

    const quotationNumber = this.makeNumber('QUO');

    // Store quotation as a note/JSON in the notifications table (lightweight approach without schema change)
    // In a real system you'd have a Quotation table — here we use notes field on a PENDING invoice
    const firstBranch = await this.prisma.branch.findFirst({ where: { tenantId } });
    if (!firstBranch) throw new BadRequestException('No branch found. Please create a branch first.');

    const firstWarehouse = await this.prisma.warehouse.findFirst({ where: { tenantId } });
    if (!firstWarehouse) throw new BadRequestException('No warehouse found.');

    const lineItems = await Promise.all(dto.items.map(async (item) => {
      const product = await this.prisma.product.findFirst({ where: { id: item.productId, tenantId } });
      if (!product) throw new BadRequestException(`Product ${item.productId} not found`);
      return {
        productId: item.productId,
        quantity: item.quantity,
        unitPrice: item.price,
        lineTotal: item.price * item.quantity,
        taxRate: 0,
        taxAmount: 0,
        warehouseId: firstWarehouse.id,
        costPrice: null,
        profit: null,
      };
    }));

    const now = new Date();
    const invoice = await this.prisma.salesInvoice.create({
      data: {
        tenantId,
        branchId: firstBranch.id,
        invoiceNumber: quotationNumber,
        invoiceDate: now,
        invoiceTime: now,
        saleType: 'CASH',
        subtotal: dto.totalAmount,
        discountAmount: 0,
        taxAmount: 0,
        totalAmount: dto.totalAmount,
        paymentStatus: 'UNPAID',
        status: 'PENDING',
        notes: `QUOTATION | Customer: ${dto.customerName} | Phone: ${dto.phone || 'N/A'} | Valid Until: ${dto.validUntil}`,
        cashierId: userId,
        items: { create: lineItems },
      },
    });

    return {
      success: true,
      quotationId: invoice.id,
      quotationNumber,
      message: 'Quotation created successfully.',
    };
  }

  // ─── CREDIT SALE ─────────────────────────────────────────────────────────────
  async processCreditSale(dto: CreateCreditSaleDto, tenantId: string, userId: string) {
    this.logger.log(`Processing credit sale for customer=${dto.customerId}, tenant=${tenantId}`);

    const customer = await this.prisma.customer.findFirst({
      where: { id: dto.customerId, tenantId },
    });

    if (!customer) throw new BadRequestException('Customer not found.');

    const firstBranch = await this.prisma.branch.findFirst({ where: { tenantId } });
    if (!firstBranch) throw new BadRequestException('No branch found.');

    const now = new Date();
    const invoiceNumber = this.makeNumber('CRD');

    const invoice = await this.prisma.salesInvoice.create({
      data: {
        tenantId,
        branchId: firstBranch.id,
        customerId: dto.customerId,
        invoiceNumber,
        invoiceDate: now,
        invoiceTime: now,
        saleType: 'CREDIT',
        subtotal: dto.amount,
        discountAmount: 0,
        taxAmount: 0,
        totalAmount: dto.amount,
        paidAmount: 0,
        balance: dto.amount,
        paymentStatus: 'UNPAID',
        status: 'COMPLETED',
        notes: `CREDIT SALE | Ref: ${dto.reference || 'N/A'} | Terms: Net ${dto.paymentTermsDays || 30}`,
        cashierId: userId,
      },
    });

    // Update customer outstanding balance
    await this.prisma.customer.update({
      where: { id: dto.customerId },
      data: {
        outstandingBalance: { increment: dto.amount },
        totalPurchases: { increment: dto.amount },
      },
    });

    return {
      success: true,
      invoiceId: invoice.id,
      invoiceNumber,
      message: 'Credit sale recorded successfully.',
    };
  }

  // ─── BULK SALE ───────────────────────────────────────────────────────────────
  async processBulkSale(dto: CreateBulkSaleDto, tenantId: string, userId: string) {
    this.logger.log(`Processing bulk sale for ${dto.wholesaleId}, tenant=${tenantId}`);

    const firstBranch = await this.prisma.branch.findFirst({ where: { tenantId } });
    if (!firstBranch) throw new BadRequestException('No branch found.');

    const now = new Date();
    const invoiceNumber = this.makeNumber('BULK');

    const invoice = await this.prisma.salesInvoice.create({
      data: {
        tenantId,
        branchId: firstBranch.id,
        invoiceNumber,
        invoiceDate: now,
        invoiceTime: now,
        saleType: 'CASH',
        subtotal: dto.subtotal,
        discountAmount: dto.discountAmount,
        taxAmount: 0,
        totalAmount: dto.finalTotal,
        paymentStatus: 'PAID',
        status: 'COMPLETED',
        notes: `BULK/WHOLESALE | Buyer ID: ${dto.wholesaleId} | Discount: ${dto.discountType} ${dto.discountValue ?? 0}`,
        cashierId: userId,
      },
    });

    return {
      success: true,
      invoiceId: invoice.id,
      invoiceNumber,
      finalTotal: dto.finalTotal,
      message: 'Bulk/wholesale sale recorded successfully.',
    };
  }

  // ─── HOLD SALE ───────────────────────────────────────────────────────────────
  async holdSale(dto: CreateHoldSaleDto, tenantId: string, userId: string) {
    this.logger.log(`Holding sale for tenant=${tenantId}`);

    const firstBranch = await this.prisma.branch.findFirst({ where: { tenantId } });
    if (!firstBranch) throw new BadRequestException('No branch found.');

    const now = new Date();
    const invoiceNumber = this.makeNumber('HOLD');

    const invoice = await this.prisma.salesInvoice.create({
      data: {
        tenantId,
        branchId: firstBranch.id,
        customerId: dto.customerId ?? null,
        invoiceNumber,
        invoiceDate: now,
        invoiceTime: now,
        saleType: 'CASH',
        subtotal: dto.totalAmount,
        discountAmount: 0,
        taxAmount: 0,
        totalAmount: dto.totalAmount,
        paymentStatus: 'UNPAID',
        status: 'PENDING',
        notes: `HOLD | Ref: ${dto.reference || 'Unnamed Cart'} | Items: ${JSON.stringify(dto.items)}`,
        cashierId: userId,
      },
    });

    return {
      success: true,
      holdId: invoice.id,
      invoiceNumber,
      message: 'Sale held successfully. Resume anytime from the Held Sales screen.',
    };
  }

  // ─── LIST HELD SALES ─────────────────────────────────────────────────────────
  async getHeldSales(tenantId: string) {
    const held = await this.prisma.salesInvoice.findMany({
      where: { tenantId, status: 'PENDING', notes: { startsWith: 'HOLD' } },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });

    return {
      success: true,
      data: held.map(h => {
        const refMatch = h.notes?.match(/Ref: (.+?) \|/);
        const itemsMatch = h.notes?.match(/Items: (.+)$/);
        let items = [];
        try { items = JSON.parse(itemsMatch?.[1] || '[]'); } catch {}
        return {
          id: h.id,
          reference: refMatch?.[1] || h.invoiceNumber,
          items,
          itemCount: items.length,
          totalAmount: Number(h.totalAmount),
          createdAt: h.createdAt,
        };
      }),
    };
  }

  // ─── EXCHANGE ────────────────────────────────────────────────────────────────
  async processExchange(dto: CreateExchangeDto, tenantId: string, userId: string) {
    this.logger.log(`Processing exchange for invoice=${dto.invoiceId}, tenant=${tenantId}`);

    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(dto.invoiceId);
    const invoice = await this.prisma.salesInvoice.findFirst({
      where: {
        tenantId,
        ...(isUuid ? { id: dto.invoiceId } : { invoiceNumber: dto.invoiceId }),
      },
      include: { items: true },
    });

    if (!invoice) throw new BadRequestException('Original invoice not found.');

    const firstBranch = await this.prisma.branch.findFirst({ where: { tenantId } });
    const branchId = invoice.branchId || firstBranch?.id;
    if (!branchId) throw new BadRequestException('Branch not found.');

    const now = new Date();
    const exchangeNumber = this.makeNumber('EXC');
    const retNumber = this.makeNumber('RET');

    const result = await this.prisma.$transaction(async (tx) => {
      // 1. Handle Returned Items
      const returnedItemsWithCost: any[] = [];
      let totalRefund = 0;
      let totalTaxRefund = 0;
      if (dto.returnedItems && dto.returnedItems.length > 0) {
        // Restock returned items
        for (const item of dto.returnedItems) {
          // Resolve stock for returned item — try with warehouseId, fallback to any stock for product
          let stock = item.warehouseId
            ? await tx.stock.findFirst({ where: { tenantId, productId: item.productId, warehouseId: item.warehouseId } })
            : null;

          if (!stock) {
            stock = await tx.stock.findFirst({ where: { tenantId, productId: item.productId } });
          }
 
          if (stock) {
            await tx.stock.update({
              where: { id: stock.id },
              data: { quantity: { increment: item.quantity } },
            });
          }
 
          // Find original item and validate quantity
          const invoiceItem = (invoice as any).items?.find((i: any) => i.productId === item.productId);
          if (!invoiceItem) throw new BadRequestException(`Product ${item.productId} not found on original invoice.`);

          const originalQty = Number(invoiceItem.quantity);
          if (item.quantity > originalQty) {
            throw new BadRequestException(`Cannot return more than available on invoice. Requested: ${item.quantity}, Available: ${originalQty}`);
          }

          let costPrice = invoiceItem.costPrice ? Number(invoiceItem.costPrice) : 0;
          if (!costPrice) {
            const product = await tx.product.findFirst({ where: { id: item.productId, tenantId } });
            costPrice = product?.purchasePrice ? Number(product.purchasePrice) : 0;
          }
 
          returnedItemsWithCost.push({
            ...item,
            costPrice,
          });

          // Mutate original invoice item
          const newQty = originalQty - item.quantity;
          const unitPrice = Number(item.price) || Number(invoiceItem.unitPrice);
          const newTotal = newQty * unitPrice;
          const taxRate = Number(invoiceItem.taxRate) || 0;
          const newTax = newTotal - (newTotal / (1 + (taxRate / 100)));
          const profit = newTotal - (costPrice * newQty);

          await tx.salesInvoiceItem.update({
            where: { id: invoiceItem.id },
            data: {
              quantity: newQty,
              lineTotal: newTotal,
              taxAmount: newTax,
              profit: profit,
            },
          });

          // Track totals for original invoice mutation
          totalRefund += (item.quantity * unitPrice);
          totalTaxRefund += ((item.quantity * unitPrice) - ((item.quantity * unitPrice) / (1 + (taxRate / 100))));
 
          await tx.stockMovement.create({
            data: {
              tenantId,
              productId: item.productId,
              warehouseId: stock?.warehouseId || item.warehouseId,
              movementType: 'RETURN',
              quantity: item.quantity,
              beforeQuantity: stock?.quantity ?? 0,
              afterQuantity: Number(stock?.quantity ?? 0) + item.quantity,
              referenceType: 'EXCHANGE_RETURN',
              notes: `Returned via exchange from invoice ${invoice.invoiceNumber}`,
              createdBy: userId,
            },
          });
        }
 
        // Create SalesReturn record for historical tracking of the return portion
        await tx.salesReturn.create({
          data: {
            retNumber,
            tenantId,
            branchId,
            invoiceId: invoice.id,
            customerId: invoice.customerId ?? undefined,
            status: 'COMPLETED',
            totalAmount: dto.returnAmount,
            refundMethod: 'EXCHANGE',
            reason: 'Item Exchange',
            createdBy: userId,
            items: {
              create: dto.returnedItems.map(item => ({
                invoiceItemId: item.invoiceItemId,
                productId: item.productId,
                warehouseId: item.warehouseId,
                quantity: item.quantity,
                condition: 'GOOD',
                unitPrice: item.price,
                lineTotal: item.quantity * item.price,
              })),
            },
          },
        });
      }
 
      // 2. Handle New Items
      const newItemsWithCost: any[] = [];
      if (dto.newItems && dto.newItems.length > 0) {
        for (const item of dto.newItems) {
          // Resolve stock — first try with provided warehouseId, fallback to any stock for this product
          let stock = item.warehouseId
            ? await tx.stock.findFirst({ where: { tenantId, productId: item.productId, warehouseId: item.warehouseId } })
            : null;

          if (!stock) {
            // Fallback: find any stock record for this product in the tenant
            stock = await tx.stock.findFirst({ where: { tenantId, productId: item.productId } });
          }

          if (!stock) {
            const product = await tx.product.findFirst({ where: { id: item.productId, tenantId } });
            throw new BadRequestException(`No stock record found for product "${product?.name || item.productId}". Please add stock first.`);
          }

          if (Number(stock.quantity) < item.quantity) {
            const product = await tx.product.findFirst({ where: { id: item.productId, tenantId } });
            throw new BadRequestException(`Insufficient stock for "${product?.name || item.productId}". Available: ${stock.quantity}, Requested: ${item.quantity}`);
          }

          const resolvedWarehouseId = stock.warehouseId;

          await tx.stock.update({
            where: { id: stock.id },
            data: { quantity: { decrement: item.quantity } },
          });
 
          const product = await tx.product.findFirst({ where: { id: item.productId, tenantId } });
          const costPrice = product?.purchasePrice ? Number(product.purchasePrice) : 0;
          const taxRate = Number(product?.taxRate ?? 0);
 
          newItemsWithCost.push({
            ...item,
            costPrice,
            taxRate,
            warehouseId: resolvedWarehouseId,
          });
 
          await tx.stockMovement.create({
            data: {
              tenantId,
              productId: item.productId,
              warehouseId: resolvedWarehouseId,
              movementType: 'OUT',
              quantity: -item.quantity,
              beforeQuantity: stock.quantity,
              afterQuantity: Number(stock.quantity) - item.quantity,
              referenceType: 'EXCHANGE_SALE',
              notes: `New item issued via exchange from invoice ${invoice.invoiceNumber}`,
              createdBy: userId,
            },
          });
        }
      }

      // Mutate original invoice totals if there were returns - REMOVED.
      // We do NOT mutate the original invoice totals because the discount on the EXC- 
      // invoice handles the financial deduction. Mutating both would double-deduct revenue.
 
      // 3. Create the Exchange Invoice for the new items
      // This invoice uses the returnAmount as a discount (Exchange Credit) so the customer only pays the delta.
      const invoiceItems: any[] = [];
      
      // Note: We no longer add negative lines because the original invoice is mutated directly.
      // Add positive lines for new items with tax-inclusive tax extraction
      let totalNewTax = 0;
      if (dto.newItems) {
        for (const item of newItemsWithCost) {
          const itemCostPrice = Number(item.costPrice ?? 0);
          const itemQty = item.quantity;
          const itemLineTotal = item.quantity * item.price;
          const itemTaxRate = Number(item.taxRate ?? 0);
          // Tax-inclusive: extract tax from the sticker price
          const itemBasePrice = itemTaxRate > 0 ? itemLineTotal / (1 + (itemTaxRate / 100)) : itemLineTotal;
          const itemTaxAmount = itemLineTotal - itemBasePrice;
          totalNewTax += itemTaxAmount;
          const itemProfit = itemLineTotal - (itemCostPrice * itemQty);
          invoiceItems.push({
            productId: item.productId,
            warehouseId: item.warehouseId,
            quantity: itemQty,
            unitPrice: item.price,
            lineTotal: itemLineTotal,
            taxRate: itemTaxRate,
            taxAmount: itemTaxAmount,
            costPrice: itemCostPrice,
            profit: itemProfit,
          });
        }
      }
 
      const exchangeInvoice = await tx.salesInvoice.create({
        data: {
          tenantId,
          branchId,
          customerId: invoice.customerId ?? undefined,
          invoiceNumber: exchangeNumber,
          invoiceDate: now,
          invoiceTime: now,
          saleType: 'CASH',
          subtotal: dto.newAmount, // Subtotal of only the new items (tax inclusive)
          discountAmount: dto.returnAmount, // Exchange credit applied as discount
          taxAmount: totalNewTax, // Extracted tax portion (for accounting records)
          totalAmount: dto.delta > 0 ? dto.delta : 0, // Customer pays the difference
          paidAmount: dto.delta > 0 ? dto.delta : 0,
          balance: 0,
          paymentStatus: 'PAID',
          status: 'COMPLETED',
          notes: `EXCHANGE | Original: ${invoice.invoiceNumber} | Returned: Rs.${dto.returnAmount} | New: Rs.${dto.newAmount} | Net Delta: Rs.${dto.delta}`,
          cashierId: userId,
          items: {
            create: invoiceItems,
          },
        },
      });

      // DO NOT mark the original invoice as RETURNED. Keep it COMPLETED to maintain accurate ledger data.

      return {
        success: true,
        exchangeId: exchangeInvoice.id,
        exchangeNumber,
        delta: dto.delta,
        message: dto.delta > 0
          ? `Exchange complete. Customer owes Rs. ${dto.delta}.`
          : `Exchange complete. Refund Rs. ${Math.abs(dto.delta)} due to customer.`,
      };
    });

    await this.activityLogsService.log(
      tenantId,
      userId,
      'EXCHANGE_SALE',
      `Processed exchange ${result.exchangeNumber} for Invoice ${invoice.invoiceNumber}. New items: Rs. ${dto.newAmount}, Returned items: Rs. ${dto.returnAmount}`,
      dto.delta,
    );

    if (invoice.customerId) {
      this.prisma.customer.findUnique({ where: { id: invoice.customerId } })
        .then(customer => {
          if (customer?.phone) {
            this.smsService.sendReceiptSMS(customer.phone, result.exchangeId);
          }
        })
        .catch(err => this.logger.error('Failed to fetch customer for SMS', err));
    }

    return result;
  }

  // ─── LAYAWAY ─────────────────────────────────────────────────────────────────
  async createLayaway(dto: CreateLayawayDto, tenantId: string, userId: string) {
    this.logger.log(`Creating layaway for ${dto.customerName}, tenant=${tenantId}`);

    const firstBranch = await this.prisma.branch.findFirst({ where: { tenantId } });
    if (!firstBranch) throw new BadRequestException('No branch found.');

    const now = new Date();
    const layawayNumber = this.makeNumber('LAY');

    const invoice = await this.prisma.salesInvoice.create({
      data: {
        tenantId,
        branchId: firstBranch.id,
        invoiceNumber: layawayNumber,
        invoiceDate: now,
        invoiceTime: now,
        saleType: 'CASH',
        subtotal: dto.totalAmount,
        discountAmount: 0,
        taxAmount: 0,
        totalAmount: dto.totalAmount,
        paidAmount: dto.deposit,
        balance: dto.balance,
        paymentStatus: 'PARTIAL',
        status: 'PENDING',
        notes: `LAYAWAY | Customer: ${dto.customerName} | Phone: ${dto.phone || 'N/A'} | Deposit: Rs.${dto.deposit} | Balance: Rs.${dto.balance} | Pickup: ${dto.pickupDate}`,
        cashierId: userId,
      },
    });

    return {
      success: true,
      layawayId: invoice.id,
      layawayNumber,
      deposit: dto.deposit,
      balance: dto.balance,
      message: 'Layaway agreement created successfully.',
    };
  }
}
