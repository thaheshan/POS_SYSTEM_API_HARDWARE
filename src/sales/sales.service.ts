import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCheckoutDto } from './dto/create-checkout.dto';

@Injectable()
export class SalesService {
  private readonly logger = new Logger(SalesService.name);

  constructor(private prisma: PrismaService) {}

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
          customer: { select: { name: true } }
        },
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip
      }),
      this.prisma.salesInvoice.count({ where })
    ]);

    return {
      status: 'success',
      data: {
        items: invoices.map(inv => ({
          ...inv,
          totalAmount: Number(inv.totalAmount)
        })),
        total,
        page,
        limit
      }
    };
  }

  async checkout(dto: CreateCheckoutDto, tenantId: string, userId: string) {
    this.logger.log(`Processing POS checkout for tenant=${tenantId}, items=${dto.items.length}`);

    return this.prisma.$transaction(async (tx) => {
      // --- 1. Build invoice line items & validate stock ---
      let subtotal = 0;
      const lineItems: any[] = [];
      let resolvedBranchId: string | null = null;

      for (const item of dto.items) {
        // Fetch product details (price, tax)
        const product = await tx.product.findFirst({
          where: { id: item.productId, tenantId },
        });
        if (!product) {
          throw new BadRequestException(`Product ${item.productId} not found`);
        }

        const unitPrice = item.unitPrice ?? Number(product.sellingPrice);
        const lineTotal = unitPrice * item.quantity;
        subtotal += lineTotal;

        // Find stock record for this product
        const stockRecord = await tx.stock.findFirst({
          where: {
            productId: item.productId,
            tenantId,
            ...(item.warehouseId ? { warehouseId: item.warehouseId } : {}),
          },
        });

        if (!stockRecord) {
          throw new BadRequestException(`No stock record found for product ${product.name}`);
        }

        // Resolve branchId from the stock record (real branchId from DB)
        if (!resolvedBranchId) {
          resolvedBranchId = stockRecord.branchId;
        }

        const available = Number(stockRecord.quantity) - Number(stockRecord.reservedQuantity);
        if (available < item.quantity) {
          throw new BadRequestException(
            `Insufficient stock for ${product.name}. Available: ${available}, Requested: ${item.quantity}`,
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

        lineItems.push({
          productId: item.productId,
          quantity: item.quantity,
          unitPrice,
          lineTotal: lineTotal,
          taxRate: product.taxRate ?? 0,
          taxAmount: lineTotal * (Number(product.taxRate ?? 0) / 100),
          warehouseId: stockRecord.warehouseId,
        });
      }

      // If still no branchId resolved, fall back to first branch of this tenant
      if (!resolvedBranchId) {
        const firstBranch = await tx.branch.findFirst({ where: { tenantId } });
        if (!firstBranch) {
          throw new BadRequestException('No branch found for this tenant. Please create a branch first.');
        }
        resolvedBranchId = firstBranch.id;
      }

      this.logger.log(`Using branchId: ${resolvedBranchId}`);

      // --- 2. Calculate totals ---
      const discount = dto.discount ?? 0;
      const afterDiscount = subtotal - discount;
      const taxAmount = lineItems.reduce((sum, li) => sum + li.taxAmount, 0);
      const totalAmount = afterDiscount + taxAmount;

      // --- 3. Create Sales Invoice ---
      const count = await tx.salesInvoice.count({ where: { tenantId } });
      const invoiceNumber = `INV-${new Date().getFullYear()}-${(count + 1).toString().padStart(5, '0')}`;
      const now = new Date();

      const invoice = await tx.salesInvoice.create({
        data: {
          tenantId,
          branchId: resolvedBranchId,  // ✅ Real branchId from stock record
          customerId: dto.customerId ?? null,
          invoiceNumber,
          invoiceDate: now,
          invoiceTime: now,
          saleType: 'CASH',
          subtotal: subtotal,
          discountAmount: discount,
          taxAmount,
          totalAmount,
          paymentStatus: 'PAID',
          status: 'COMPLETED',
          notes: dto.notes,
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
            })),
          },
        },
        include: { items: true },
      });

      this.logger.log(`Invoice created: ${invoice.id}, total=${totalAmount}`);

      return {
        success: true,
        invoiceId: invoice.id,
        invoiceNumber,
        totalAmount,
        message: 'Checkout completed successfully',
      };
    }).then(async (result) => {
      // Create a notification after successful checkout (outside transaction)
      try {
        await this.prisma.notification.create({
          data: {
            tenantId,
            userId,
            title: 'Sale Completed',
            message: `Invoice ${result.invoiceNumber} for LKR ${Number(result.totalAmount).toLocaleString()} was processed successfully.`,
            type: 'SUCCESS',
            link: '/sales',
          },
        });
      } catch (err) {
        this.logger.warn('Failed to create sale notification: ' + err.message);
      }
      return result;
    });
  }
}
