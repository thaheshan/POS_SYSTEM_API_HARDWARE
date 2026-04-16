import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ConflictException,
  Inject,
} from '@nestjs/common';
import { Prisma, QuotationStatus } from '@prisma/client';
import { randomUUID } from 'crypto';
import { PrismaService } from '../../prisma/prisma.service';
import { generateQuoNumber } from './utils/quo-number';
import { CreateQuotationDto } from './dto/create-quotation.dto';
import {
  UpdateQuotationDto,
  UpdateQuotationStatusDto,
  QuotationResponse,
  QuotationsPaginatedResponse,
  ConvertToInvoiceDto,
} from './dto/quotation.dto';
import type { CacheClient } from 'src/cache/cache-client.interface';

@Injectable()
export class QuotationsService {
  private readonly quotationCacheTtlSeconds = 300; // 5 minutes

  constructor(
    private readonly prisma: PrismaService,
    @Inject('REDIS_CLIENT') private readonly redis: CacheClient,
  ) {}

  async createQuotation(
    tenantId: string,
    dto: CreateQuotationDto,
    createdBy: string,
  ): Promise<QuotationResponse> {
    if (!dto.items || dto.items.length === 0) {
      throw new BadRequestException('Quotation must have at least one item');
    }

    // Generate QUO number - sequential per year
    const currentYear = new Date().getFullYear();
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Count quotations created this year for this tenant
    const countThisYear = await this.prisma.quotation.count({
      where: {
        tenantId,
        createdAt: {
          gte: new Date(currentYear, 0, 1), // Jan 1st of current year
          lt: new Date(currentYear + 1, 0, 1), // Jan 1st of next year
        },
        status: { not: QuotationStatus.expired },
      },
    });

    const quoNumber = generateQuoNumber(currentYear, countThisYear + 1);

    // Calculate totals
    const itemsData = dto.items.map((item) => {
      const quantity = new Prisma.Decimal(item.quantity);
      const unitPrice = new Prisma.Decimal(item.unitPrice);
      const discountPct = item.discountPercentage
        ? new Prisma.Decimal(item.discountPercentage)
        : new Prisma.Decimal(0);
      const taxRate = item.taxRate
        ? new Prisma.Decimal(item.taxRate)
        : new Prisma.Decimal(0);

      // Line calculation: quantity * unitPrice * (1 - discount%) * (1 + tax%)
      const subtotalBeforeTax = quantity
        .times(unitPrice)
        .times(new Prisma.Decimal(1).minus(discountPct.dividedBy(100)));
      const lineTotal = subtotalBeforeTax.times(
        new Prisma.Decimal(1).plus(taxRate.dividedBy(100)),
      );

      return {
        productId: item.productId,
        variantId: item.variantId || undefined,
        productName: item.productName,
        quantity,
        unitPrice,
        discountPercentage: item.discountPercentage
          ? new Prisma.Decimal(item.discountPercentage)
          : null,
        taxRate: item.taxRate ? new Prisma.Decimal(item.taxRate) : null,
        lineTotal,
      };
    });

    const subtotal = itemsData.reduce((sum, item) => {
      const qty = new Prisma.Decimal(item.quantity);
      const price = new Prisma.Decimal(item.unitPrice);
      const discount = item.discountPercentage
        ? item.discountPercentage
        : new Prisma.Decimal(0);
      return sum.plus(
        qty
          .times(price)
          .times(new Prisma.Decimal(1).minus(discount.dividedBy(100))),
      );
    }, new Prisma.Decimal(0));

    const totalTax = itemsData.reduce((sum, item) => {
      if (!item.taxRate) return sum;
      const qty = new Prisma.Decimal(item.quantity);
      const price = new Prisma.Decimal(item.unitPrice);
      const discount = item.discountPercentage
        ? item.discountPercentage
        : new Prisma.Decimal(0);
      const subtotalLine = qty
        .times(price)
        .times(new Prisma.Decimal(1).minus(discount.dividedBy(100)));
      return sum.plus(subtotalLine.times(item.taxRate.dividedBy(100)));
    }, new Prisma.Decimal(0));

    const validUntil = new Date(dto.validUntil);
    validUntil.setHours(0, 0, 0, 0);

    const quotation = await this.prisma.quotation.create({
      data: {
        tenantId,
        quotationNumber: quoNumber,
        quotationDate: today,
        validUntil,
        customerId: dto.customerId || undefined,
        customerName: dto.customerName,
        customerPhone: dto.customerPhone,
        subtotal,
        discountAmount: new Prisma.Decimal(0), // Item-level discounts
        taxAmount: totalTax,
        totalAmount: subtotal.plus(totalTax),
        status: QuotationStatus.draft,
        notes: dto.notes,
        termsConditions: dto.termsConditions,
        createdBy,
        items: {
          createMany: {
            data: itemsData,
          },
        },
      },
      include: {
        items: true,
      },
    });

    // Invalidate list cache
    await this.invalidateQuotationsListCache(tenantId);

    return this.formatQuotationResponse(quotation);
  }

  async getQuotations(
    tenantId: string,
    filters: {
      status?: string;
      limit?: number;
      cursor?: string;
    } = {},
  ): Promise<QuotationsPaginatedResponse> {
    // Auto-expire quotations before fetching
    await this.autoExpireQuotations(tenantId);

    // Try cache first (using filters as part of cache key)
    const cacheKey = this.getQuotationsListCacheKey(tenantId, filters);
    const cached = await this.redis.get(cacheKey);
    if (cached) {
      return JSON.parse(cached);
    }

    const { status, limit = 50, cursor } = filters;

    const where: Prisma.QuotationWhereInput = {
      tenantId,
    };

    if (status) {
      where.status = status as unknown as QuotationStatus;
    }

    const quotations = await this.prisma.quotation.findMany({
      where,
      include: {
        items: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: limit + 1,
      skip: cursor ? 1 : 0,
      ...(cursor && { cursor: { id: cursor } }),
    });

    let hasMore = false;
    let nextCursor: string | null = null;

    if (quotations.length > limit) {
      hasMore = true;
      quotations.pop();
      const lastQuotation = quotations[quotations.length - 1];
      nextCursor = lastQuotation.id;
    }

    const data = quotations.map((q) => this.formatQuotationResponse(q));

    const response: QuotationsPaginatedResponse = {
      data,
      pagination: {
        nextCursor,
        hasMore,
        limit,
      },
    };

    // Cache the list response
    await this.redis.set(
      cacheKey,
      JSON.stringify(response),
      'EX',
      this.quotationCacheTtlSeconds,
    );

    return response;
  }

  async getQuotationById(
    tenantId: string,
    id: string,
  ): Promise<QuotationResponse> {
    // Auto-expire before fetching
    await this.autoExpireQuotations(tenantId);

    // Try cache first
    const cacheKey = this.getQuotationCacheKey(tenantId, id);
    const cached = await this.redis.get(cacheKey);
    if (cached) {
      return JSON.parse(cached);
    }

    const quotation = await this.prisma.quotation.findFirst({
      where: {
        id,
        tenantId,
      },
      include: {
        items: true,
      },
    });

    if (!quotation) {
      throw new NotFoundException(`Quotation ${id} not found`);
    }

    const response = this.formatQuotationResponse(quotation);

    // Cache the response
    await this.redis.set(
      cacheKey,
      JSON.stringify(response),
      'EX',
      this.quotationCacheTtlSeconds,
    );

    return response;
  }

  async updateQuotation(
    tenantId: string,
    id: string,
    dto: UpdateQuotationDto,
  ): Promise<QuotationResponse> {
    const quotation = await this.prisma.quotation.findFirst({
      where: { id, tenantId },
    });

    if (!quotation) {
      throw new NotFoundException(`Quotation ${id} not found`);
    }

    // Only allow updating draft quotations
    if (quotation.status !== QuotationStatus.draft) {
      throw new BadRequestException('Can only update draft quotations');
    }

    // Delete old items if updating
    if (dto.items) {
      await this.prisma.quotationItem.deleteMany({
        where: { quotationId: id },
      });
    }

    const validUntil = dto.validUntil
      ? new Date(dto.validUntil)
      : quotation.validUntil;
    if (validUntil) {
      validUntil.setHours(0, 0, 0, 0);
    }

    const itemsData = dto.items
      ? dto.items.map((item) => {
          const quantity = new Prisma.Decimal(item.quantity);
          const unitPrice = new Prisma.Decimal(item.unitPrice);
          const discountPct = item.discountPercentage
            ? new Prisma.Decimal(item.discountPercentage)
            : new Prisma.Decimal(0);
          const taxRate = item.taxRate
            ? new Prisma.Decimal(item.taxRate)
            : new Prisma.Decimal(0);

          const subtotalBeforeTax = quantity
            .times(unitPrice)
            .times(new Prisma.Decimal(1).minus(discountPct.dividedBy(100)));
          const lineTotal = subtotalBeforeTax.times(
            new Prisma.Decimal(1).plus(taxRate.dividedBy(100)),
          );

          return {
            productId: item.productId,
            variantId: item.variantId || undefined,
            productName: item.productName,
            quantity,
            unitPrice,
            discountPercentage: item.discountPercentage
              ? new Prisma.Decimal(item.discountPercentage)
              : null,
            taxRate: item.taxRate ? new Prisma.Decimal(item.taxRate) : null,
            lineTotal,
          };
        })
      : undefined;

    // Recalculate totals if items changed
    let subtotal: Prisma.Decimal | undefined;
    let totalTax: Prisma.Decimal | undefined;

    if (itemsData) {
      subtotal = itemsData.reduce((sum, item) => {
        const qty = new Prisma.Decimal(item.quantity);
        const price = new Prisma.Decimal(item.unitPrice);
        const discount = item.discountPercentage
          ? item.discountPercentage
          : new Prisma.Decimal(0);
        return sum.plus(
          qty
            .times(price)
            .times(new Prisma.Decimal(1).minus(discount.dividedBy(100))),
        );
      }, new Prisma.Decimal(0));

      totalTax = itemsData.reduce((sum, item) => {
        if (!item.taxRate) return sum;
        const qty = new Prisma.Decimal(item.quantity);
        const price = new Prisma.Decimal(item.unitPrice);
        const discount = item.discountPercentage
          ? item.discountPercentage
          : new Prisma.Decimal(0);
        const subtotalLine = qty
          .times(price)
          .times(new Prisma.Decimal(1).minus(discount.dividedBy(100)));
        return sum.plus(subtotalLine.times(item.taxRate.dividedBy(100)));
      }, new Prisma.Decimal(0));
    }

    const updated = await this.prisma.quotation.update({
      where: { id },
      data: {
        customerId: dto.customerId !== undefined ? dto.customerId : undefined,
        customerName:
          dto.customerName !== undefined ? dto.customerName : undefined,
        customerPhone:
          dto.customerPhone !== undefined ? dto.customerPhone : undefined,
        validUntil,
        subtotal,
        taxAmount: totalTax,
        totalAmount: subtotal
          ? subtotal.plus(totalTax || new Prisma.Decimal(0))
          : undefined,
        notes: dto.notes !== undefined ? dto.notes : undefined,
        termsConditions:
          dto.termsConditions !== undefined ? dto.termsConditions : undefined,
        ...(itemsData && {
          items: {
            createMany: {
              data: itemsData,
            },
          },
        }),
      },
      include: {
        items: true,
      },
    });

    // Invalidate cache
    await this.invalidateQuotationCache(tenantId, id);
    await this.invalidateQuotationsListCache(tenantId);
    return this.formatQuotationResponse(updated);
  }

  async updateStatus(
    tenantId: string,
    id: string,
    dto: UpdateQuotationStatusDto,
  ): Promise<QuotationResponse> {
    const quotation = await this.prisma.quotation.findFirst({
      where: { id, tenantId },
      include: {
        items: true,
      },
    });

    if (!quotation) {
      throw new NotFoundException(`Quotation ${id} not found`);
    }

    const updated = await this.prisma.quotation.update({
      where: { id },
      data: {
        status: dto.status as unknown as QuotationStatus,
        updatedAt: new Date(),
      },
      include: {
        items: true,
      },
    });

    // Invalidate both individual and list cache
    await this.invalidateQuotationCache(tenantId, id);
    await this.invalidateQuotationsListCache(tenantId);

    return this.formatQuotationResponse(updated);
  }

  async convertToInvoice(
    tenantId: string,
    quotationId: string,
    dto: ConvertToInvoiceDto = {},
  ): Promise<{ invoiceId: string; message: string }> {
    const quotation = await this.prisma.quotation.findFirst({
      where: {
        id: quotationId,
        tenantId,
      },
      include: {
        items: {
          include: {
            product: true,
            variant: true,
          },
        },
      },
    });

    if (!quotation) {
      throw new NotFoundException(`Quotation ${quotationId} not found`);
    }

    // Check if quotation is expired
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (quotation.validUntil && quotation.validUntil < today) {
      throw new ConflictException(
        'QUOTATION_EXPIRED',
        'This quotation has expired and cannot be converted',
      );
    }

    // Check stock availability for all items
    const stockChecks = await Promise.all(
      quotation.items.map(async (item) => {
        const stock = await this.prisma.stock.findFirst({
          where: {
            tenantId,
            productId: item.productId,
            variantId: item.variantId || undefined,
          },
        });

        const available = stock?.quantity || new Prisma.Decimal(0);
        const required = new Prisma.Decimal(item.quantity || 0);

        return {
          itemId: item.id,
          productName: item.productName,
          available: available.toString(),
          required: required.toString(),
          isSufficient: available.greaterThanOrEqualTo(required),
        };
      }),
    );

    const insufficientItems = stockChecks.filter(
      (check) => !check.isSufficient,
    );

    if (insufficientItems.length > 0 && !dto.allowStockOverride) {
      throw new ConflictException(
        'INSUFFICIENT_STOCK',
        `Insufficient stock for: ${insufficientItems.map((i) => i.productName).join(', ')}`,
      );
    }

    // === PHASE 2: Create SalesInvoice from Quotation ===
    const invoiceId = randomUUID();
    const currentYear = new Date().getFullYear();

    // Generate sequential invoice number
    const countThisYear = await this.prisma.salesInvoice.count({
      where: {
        tenantId,
        createdAt: {
          gte: new Date(currentYear, 0, 1),
          lt: new Date(currentYear + 1, 0, 1),
        },
      },
    });

    const invoiceNumber = `INV-${currentYear}-${String(countThisYear + 1).padStart(5, '0')}`;
    const invoiceTime = new Date();

    // Create SalesInvoice with items in a transaction
    const invoice = await this.prisma.$transaction(async (tx) => {
      // Create invoice
      const newInvoice = await tx.salesInvoice.create({
        data: {
          id: invoiceId,
          tenantId,
          invoiceNumber,
          invoiceDate: today,
          invoiceTime,
          customerId: quotation.customerId || undefined,
          customerName: quotation.customerName,
          customerPhone: quotation.customerPhone,
          saleType: 'credit', // Default to credit sale (can be overridden later)
          subtotal: quotation.subtotal || new Prisma.Decimal(0),
          discountAmount: quotation.discountAmount || new Prisma.Decimal(0),
          taxAmount: quotation.taxAmount || new Prisma.Decimal(0),
          totalAmount: quotation.totalAmount || new Prisma.Decimal(0),
          paidAmount: new Prisma.Decimal(0),
          changeAmount: new Prisma.Decimal(0),
          balance: quotation.totalAmount || new Prisma.Decimal(0),
          paymentStatus: 'unpaid',
          status: 'pending',
          cashierId: quotation.createdBy || undefined,
        },
      });

      // Copy quotation items to invoice items
      await Promise.all(
        quotation.items.map(async (qItem) => {
          const discountPct =
            qItem.quantity && qItem.unitPrice && qItem.discountPercentage
              ? new Prisma.Decimal(qItem.quantity)
                  .times(qItem.unitPrice)
                  .times(qItem.discountPercentage.dividedBy(100))
              : new Prisma.Decimal(0);

          const taxAmt =
            qItem.quantity &&
            qItem.unitPrice &&
            qItem.discountPercentage &&
            qItem.taxRate
              ? new Prisma.Decimal(qItem.quantity)
                  .times(qItem.unitPrice)
                  .times(
                    new Prisma.Decimal(1).minus(
                      qItem.discountPercentage.dividedBy(100),
                    ),
                  )
                  .times(qItem.taxRate.dividedBy(100))
              : new Prisma.Decimal(0);

          return tx.salesInvoiceItem.create({
            data: {
              invoiceId: newInvoice.id,
              productId: qItem.productId,
              variantId: qItem.variantId || undefined,
              productName: qItem.productName,
              quantity: qItem.quantity || new Prisma.Decimal(0),
              unitPrice: qItem.unitPrice || new Prisma.Decimal(0),
              discountAmount: discountPct,
              discountPercentage: qItem.discountPercentage || undefined,
              taxRate: qItem.taxRate || undefined,
              taxAmount: taxAmt,
              lineTotal: qItem.lineTotal || new Prisma.Decimal(0),
              costPrice: qItem.product?.purchasePrice || undefined,
            },
          });
        }),
      );

      // Update quotation status to accepted
      await tx.quotation.update({
        where: { id: quotationId },
        data: {
          status: QuotationStatus.accepted,
          updatedAt: new Date(),
        },
      });

      return newInvoice;
    });

    // Invalidate both individual and list cache
    await this.invalidateQuotationCache(tenantId, quotationId);
    await this.invalidateQuotationsListCache(tenantId);

    return {
      invoiceId: invoice.id,
      message: `Quotation ${quotation.quotationNumber} successfully converted to Invoice ${invoiceNumber}`,
    };
  }

  /**
   * Auto-expire quotations where validUntil < today
   */
  private async autoExpireQuotations(tenantId: string): Promise<number> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const result = await this.prisma.quotation.updateMany({
      where: {
        tenantId,
        validUntil: { lt: today },
        status: { not: QuotationStatus.expired },
      },
      data: {
        status: QuotationStatus.expired,
        updatedAt: new Date(),
      },
    });

    return result.count;
  }

  /**
   * Format quotation for response with Decimal to string conversion
   */
  private formatQuotationResponse(quotation: any): QuotationResponse {
    /* eslint-disable @typescript-eslint/no-unsafe-member-access,@typescript-eslint/no-unsafe-assignment,@typescript-eslint/no-unsafe-call */
    return {
      id: quotation.id,
      tenantId: quotation.tenantId,
      quotationNumber: quotation.quotationNumber,
      quotationDate: quotation.quotationDate.toISOString().split('T')[0],
      validUntil: quotation.validUntil
        ? quotation.validUntil.toISOString().split('T')[0]
        : null,
      customerId: quotation.customerId,
      customerName: quotation.customerName,
      customerPhone: quotation.customerPhone,
      subtotal: quotation.subtotal?.toString() || null,
      discountAmount: quotation.discountAmount?.toString() || null,
      taxAmount: quotation.taxAmount?.toString() || null,
      totalAmount: quotation.totalAmount?.toString() || null,
      status: quotation.status,
      notes: quotation.notes,
      termsConditions: quotation.termsConditions,
      createdBy: quotation.createdBy,
      createdAt: quotation.createdAt.toISOString(),
      updatedAt: quotation.updatedAt.toISOString(),
      items: quotation.items.map((item: any) => ({
        id: item.id,
        productId: item.productId,
        variantId: item.variantId,
        productName: item.productName,
        quantity: item.quantity?.toString() || null,
        unitPrice: item.unitPrice?.toString() || null,
        discountPercentage: item.discountPercentage?.toString() || null,
        taxRate: item.taxRate?.toString() || null,
        lineTotal: item.lineTotal?.toString() || null,
      })),
    };
  }

  private getQuotationCacheKey(tenantId: string, id: string): string {
    return `quo:${tenantId}:${id}`;
  }

  private async invalidateQuotationCache(
    tenantId: string,
    id: string,
  ): Promise<void> {
    const cacheKey = this.getQuotationCacheKey(tenantId, id);
    await this.redis.del(cacheKey);
  }

  private getQuotationsListCacheKey(
    tenantId: string,
    filters: { status?: string; limit?: number; cursor?: string },
  ): string {
    const status = filters.status || 'all';
    const cursor = filters.cursor || 'start';
    const limit = filters.limit || 50;
    return `quo_list:${tenantId}:${status}:${limit}:${cursor}`;
  }

  private async invalidateQuotationsListCache(tenantId: string): Promise<void> {
    // Invalidate all common quotation list cache entries for this tenant
    // by deleting keys for all common status filters and cursor positions
    const statuses = [
      'all',
      'draft',
      'sent',
      'accepted',
      'rejected',
      'expired',
    ];
    const limits = [10, 20, 50, 100];
    const cursors = ['start', 'null'];

    for (const status of statuses) {
      for (const limit of limits) {
        for (const cursor of cursors) {
          const key = `quo_list:${tenantId}:${status}:${limit}:${cursor}`;
          await this.redis.del(key);
        }
      }
    }
  }
}
