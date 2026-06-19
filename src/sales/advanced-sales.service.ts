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

@Injectable()
export class AdvancedSalesService {
  private readonly logger = new Logger(AdvancedSalesService.name);

  constructor(private prisma: PrismaService) {}

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

    return this.prisma.$transaction(async (tx) => {
      // 1. Build return items, validate quantities, and restore stock
      const returnItems: any[] = [];
      let totalRefund = 0;

      for (const item of dto.items) {
        const invoiceItem = invoice.items.find((i: any) => i.productId === item.productId);
        if (!invoiceItem) throw new BadRequestException(`Product ${item.productId} not found on original invoice.`);

        const qty = Number(item.quantity);
        const unitPrice = Number(item.price) || Number(invoiceItem.unitPrice);
        const lineTotal = unitPrice * qty;
        totalRefund += lineTotal;

        const condition = (item.condition && ['GOOD', 'DAMAGED', 'EXPIRED'].includes(item.condition.toUpperCase())
          ? item.condition.toUpperCase()
          : 'GOOD') as any;

        // Restore stock
        const stockRecord = await tx.stock.findFirst({
          where: { productId: item.productId, warehouseId: item.warehouseId, tenantId },
        });
        if (!stockRecord) throw new BadRequestException(`Stock record not found for product ${item.productId}`);

        await tx.stock.update({
          where: { id: stockRecord.id },
          data: { quantity: { increment: qty } },
        });

        // Stock movement for return
        await tx.stockMovement.create({
          data: {
            tenantId,
            productId: item.productId,
            warehouseId: item.warehouseId,
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
          warehouseId: item.warehouseId,
          quantity: qty,
          condition,
          unitPrice,
          lineTotal,
          costPrice: invoiceItem.costPrice ? Number(invoiceItem.costPrice) : 0,
        });
      }

      // 2. Create the SalesReturn record
      const retNumber = this.makeNumber('RET');

      const salesReturn = await tx.salesReturn.create({
        data: {
          retNumber,
          tenantId,
          branchId: invoice.branchId,
          invoiceId: invoice.id,
          customerId: invoice.customerId ?? undefined,
          status: 'COMPLETED',
          totalAmount: dto.refundAmount || totalRefund,
          refundMethod,
          reason: dto.reason,
          createdBy: userId,
          items: {
            create: returnItems.map(item => ({
              invoiceItemId: item.invoiceItemId,
              productId: item.productId,
              warehouseId: item.warehouseId,
              quantity: item.quantity,
              condition: item.condition,
              unitPrice: item.unitPrice,
              lineTotal: item.lineTotal,
            })),
          },
        },
        include: { items: true },
      });

      // 3. Create a Contra Invoice to deduct revenue on the current day
      await tx.salesInvoice.create({
        data: {
          tenantId,
          branchId: invoice.branchId,
          customerId: invoice.customerId ?? undefined,
          invoiceNumber: `CN-${retNumber}`, // Credit Note style invoice number
          invoiceDate: new Date(),
          invoiceTime: new Date(),
          saleType: 'CASH',
          subtotal: -totalRefund,
          discountAmount: 0,
          taxAmount: 0,
          totalAmount: -totalRefund,
          paidAmount: -totalRefund,
          balance: 0,
          paymentStatus: 'PAID',
          status: 'COMPLETED',
          notes: `RETURN for invoice ${invoice.invoiceNumber} | Reason: ${dto.reason}`,
          cashierId: userId,
          items: {
            create: returnItems.map(item => {
              const itemCostPrice = Number(item.costPrice ?? 0);
              const itemQty = -item.quantity;
              const itemLineTotal = -item.lineTotal;
              const itemProfit = itemLineTotal - (itemCostPrice * itemQty);
              return {
                productId: item.productId,
                warehouseId: item.warehouseId,
                quantity: itemQty,
                unitPrice: item.unitPrice,
                lineTotal: itemLineTotal,
                taxRate: 0,
                taxAmount: 0,
                costPrice: itemCostPrice,
                profit: itemProfit,
              };
            }),
          },
        },
      });

      // Note: We DO NOT change the original invoice status to 'RETURNED'.
      // Keeping it 'COMPLETED' ensures historical revenue from the day it was sold remains accurate.

      // 4. Create a notification
      this.prisma.notification.create({
        data: {
          tenantId,
          userId,
          title: 'Return Processed',
          message: `Return ${retNumber} for Rs. ${totalRefund.toLocaleString()} has been processed.`,
          type: 'WARNING',
          link: '/pos/return',
        },
      }).catch(() => {});

      return {
        success: true,
        returnId: salesReturn.id,
        returnNumber: retNumber,
        totalRefund,
        message: 'Return processed and stock restored successfully.',
      };
    });
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

    return this.prisma.$transaction(async (tx) => {
      // 1. Handle Returned Items
      const returnedItemsWithCost: any[] = [];
      if (dto.returnedItems && dto.returnedItems.length > 0) {
        // Restock returned items
        for (const item of dto.returnedItems) {
          const stock = await tx.stock.findFirst({
            where: { tenantId, productId: item.productId, warehouseId: item.warehouseId },
          });
 
          if (stock) {
            await tx.stock.update({
              where: { id: stock.id },
              data: { availableQuantity: { increment: item.quantity } },
            });
          }
 
          // Get original cost price
          const originalItem = (invoice as any).items?.find((i: any) => i.productId === item.productId);
          let costPrice = originalItem?.costPrice ? Number(originalItem.costPrice) : 0;
          if (!costPrice) {
            const product = await tx.product.findFirst({ where: { id: item.productId, tenantId } });
            costPrice = product?.purchasePrice ? Number(product.purchasePrice) : 0;
          }
 
          returnedItemsWithCost.push({
            ...item,
            costPrice,
          });
 
          await tx.stockMovement.create({
            data: {
              tenantId,
              productId: item.productId,
              warehouseId: item.warehouseId,
              movementType: 'RETURN',
              quantity: item.quantity,
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
          const stock = await tx.stock.findFirst({
            where: { tenantId, productId: item.productId, warehouseId: item.warehouseId },
          });
 
          if (stock) {
            await tx.stock.update({
              where: { id: stock.id },
              data: { availableQuantity: { decrement: item.quantity } },
            });
          }
 
          const product = await tx.product.findFirst({ where: { id: item.productId, tenantId } });
          const costPrice = product?.purchasePrice ? Number(product.purchasePrice) : 0;
 
          newItemsWithCost.push({
            ...item,
            costPrice,
          });
 
          await tx.stockMovement.create({
            data: {
              tenantId,
              productId: item.productId,
              warehouseId: item.warehouseId,
              movementType: 'OUT',
              quantity: -item.quantity,
              referenceType: 'EXCHANGE_SALE',
              notes: `New item issued via exchange from invoice ${invoice.invoiceNumber}`,
              createdBy: userId,
            },
          });
        }
      }
 
      // 3. Create the Contra/Delta Invoice
      // This invoice captures the net financial impact and contains all line items (positive and negative)
      const invoiceItems: any[] = [];
      
      // Add negative lines for returned items
      if (dto.returnedItems) {
        for (const item of returnedItemsWithCost) {
          const itemCostPrice = Number(item.costPrice ?? 0);
          const itemQty = -item.quantity;
          const itemLineTotal = -(item.quantity * item.price);
          const itemProfit = itemLineTotal - (itemCostPrice * itemQty);
          invoiceItems.push({
            productId: item.productId,
            warehouseId: item.warehouseId,
            quantity: itemQty,
            unitPrice: item.price,
            lineTotal: itemLineTotal,
            taxRate: 0,
            taxAmount: 0,
            costPrice: itemCostPrice,
            profit: itemProfit,
          });
        }
      }
 
      // Add positive lines for new items
      if (dto.newItems) {
        for (const item of newItemsWithCost) {
          const itemCostPrice = Number(item.costPrice ?? 0);
          const itemQty = item.quantity;
          const itemLineTotal = item.quantity * item.price;
          const itemProfit = itemLineTotal - (itemCostPrice * itemQty);
          invoiceItems.push({
            productId: item.productId,
            warehouseId: item.warehouseId,
            quantity: itemQty,
            unitPrice: item.price,
            lineTotal: itemLineTotal,
            taxRate: 0,
            taxAmount: 0,
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
          subtotal: dto.delta,
          discountAmount: 0,
          taxAmount: 0,
          totalAmount: dto.delta,
          paidAmount: dto.delta > 0 ? dto.delta : 0, // Customer pays delta if positive
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
