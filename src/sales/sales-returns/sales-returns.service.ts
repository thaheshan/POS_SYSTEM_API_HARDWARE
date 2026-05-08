import { Injectable, Logger } from '@nestjs/common';
import { CreateSalesReturnDto } from './dto/create-sales-return.dto';
import { PrismaService } from 'src/prisma/prisma.service';
import {
  Prisma,
  ReturnStatus,
  SalesReturn,
  RefundMethod,
  MovementType,
  CreditNoteStatus,
  InvoiceStatus,
  ReturnCondition,
} from '@prisma/client';
import {
  InvalidReturnStatusException,
  InvoiceItemNotFoundException,
  InvoiceNotFoundException,
  ReturnQuantityExceededException,
  SalesReturnNotFoundException,
  StockRecordNotFoundException,
} from './exceptions/sales-return.exceptions';
import { InvoiceItem } from './interfaces/sales-return.interfaces';
import { RejectSalesReturnDto } from './dto/reject-sales-return.dto';
import { GetSalesReturnsFilterDto } from './dto/get-sales-returns-filter.dto';

type SalesReturnWithItems = Prisma.SalesReturnGetPayload<{
  include: { items: true };
}>;

@Injectable()
export class SalesReturnsService {
  private readonly logger = new Logger(SalesReturnsService.name);
  constructor(private readonly prisma: PrismaService) {}

  // ======== Public Methods ========
  // Create return request
  async createReturnRequest(
    dto: CreateSalesReturnDto,
    userId: string,
    tenantId: string,
  ) {
    this.logger.log(`Starting return creation for Invoice: ${dto.invoiceId}`);

    return await this.runWithRetry(() =>
      this.prisma.$transaction(
        async (tx) => {
          const invoice = await tx.salesInvoice.findUnique({
            where: { id: dto.invoiceId, tenantId: tenantId },
            include: { items: true },
          });
          if (!invoice) {
            this.logger.warn(`Invoice not found: ${dto.invoiceId}`);
            throw new InvoiceNotFoundException(dto.invoiceId);
          }
          const itemsToReturn =
            dto.items?.length > 0
              ? dto.items.map((reqItem) => {
                  const dbItem = invoice.items.find(
                    (i) => i.id === reqItem.invoiceItemId,
                  );
                  if (!dbItem)
                    throw new InvoiceItemNotFoundException(
                      reqItem.invoiceItemId,
                    );

                  // STRICT MAPPING: Force all master data from the database!
                  return {
                    invoiceItemId: reqItem.invoiceItemId,
                    productId: dbItem.productId,
                    variantId: dbItem.variantId ?? undefined,
                    warehouseId: dbItem.warehouseId,
                    quantity: Number(reqItem.quantity),
                    condition: reqItem.condition,
                    unitPrice: Number(dbItem.unitPrice),
                    lineTotal: Number(dbItem.unitPrice) * reqItem.quantity,
                  };
                })
              : invoice.items.map((item) => ({
                  invoiceItemId: item.id,
                  productId: item.productId,
                  variantId: item.variantId ?? undefined,
                  warehouseId: item.warehouseId,
                  quantity: Number(item.quantity),
                  condition: ReturnCondition.GOOD,
                  unitPrice: Number(item.unitPrice),
                  lineTotal: Number(item.lineTotal),
                }));

          const previousReturns = await tx.salesReturn.findMany({
            where: {
              invoiceId: dto.invoiceId,
              status: { in: [ReturnStatus.PENDING, ReturnStatus.APPROVED] },
            },
            include: { items: true },
          });

          const alreadyReturnedMap = new Map<string, number>();
          for (const prevReturn of previousReturns) {
            for (const item of prevReturn.items) {
              const currentQty =
                alreadyReturnedMap.get(item.invoiceItemId) || 0;
              alreadyReturnedMap.set(
                item.invoiceItemId,
                currentQty + Number(item.quantity),
              );
            }
          }
          this.validateReturnQuantities(
            itemsToReturn,
            invoice.items,
            alreadyReturnedMap,
          );

          const secureTotalAmount = itemsToReturn.reduce(
            (sum, item) => sum + item.lineTotal,
            0,
          );
          dto.totalAmount = secureTotalAmount;
          const retNumber = await this.generateReturnNumber(tx, tenantId);

          dto.items = itemsToReturn;
          const mappedData = this.mapReturnData(dto, retNumber, userId);
          mappedData.tenantId = tenantId;
          mappedData.branchId = invoice.branchId;

          const newReturn = await tx.salesReturn.create({
            data: mappedData,
            include: { items: true },
          });
          this.logger.log(
            `Return created successfully with ID: ${newReturn.id}`,
          );
          return newReturn;
        },
        {
          isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
        },
      ),
    );
  }

  // Approve return request
  async approveReturn(returnId: string, userId: string, tenantId: string) {
    this.logger.log(`Approving Return ID: ${returnId} by User: ${userId}`);

    const existingReturn = await this.prisma.salesReturn.findUnique({
      where: { id: returnId, tenantId: tenantId },
    });

    if (!existingReturn) {
      this.logger.warn(`Sales return not found or unauthorized: ${returnId}`);
      throw new SalesReturnNotFoundException(returnId);
    }

    if (
      existingReturn?.refundMethod === RefundMethod.CREDIT_NOTE &&
      !existingReturn.customerId
    ) {
      throw new InvalidReturnStatusException(existingReturn.status);
    }

    return await this.runWithRetry(() =>
      this.prisma.$transaction(
        async (tx) => {
          const salesReturn = await this.getReturnWithItems(
            tx,
            returnId,
            tenantId,
          );
          this.validateReturnIsPending(salesReturn);

          await this.processReturnItems(tx, salesReturn, userId);
          await this.processFinancials(tx, salesReturn);

          const approvedReturn = await this.markReturnAsApproved(
            tx,
            returnId,
            userId,
            tenantId,
          );

          await this.updateInvoiceStatus(tx, salesReturn.invoiceId);
          return approvedReturn;
        },
        {
          isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
        },
      ),
    );
  }

  async rejectReturn(
    returnId: string,
    userId: string,
    rejectDto: RejectSalesReturnDto,
    tenantId: string,
  ) {
    this.logger.log(`Rejecting Return ID: ${returnId} by User: ${userId}`);

    const existingReturn = await this.prisma.salesReturn.findUnique({
      where: { id: returnId, tenantId: tenantId },
    });

    if (!existingReturn) {
      this.logger.warn(`Sales return not found: ${returnId}`);
      throw new SalesReturnNotFoundException(returnId);
    }

    if (existingReturn.status !== ReturnStatus.PENDING) {
      this.logger.warn(
        `Invalid return status for rejection: ${existingReturn.status}`,
      );
      throw new InvalidReturnStatusException(existingReturn.status);
    }

    let updatedReason = existingReturn.reason;
    if (rejectDto.rejectReason) {
      updatedReason = existingReturn.reason
        ? `${existingReturn.reason} | Rejected Reason: ${rejectDto.rejectReason}`
        : `Rejected Reason: ${rejectDto.rejectReason}`;
    }

    const rejectedReturn = await this.prisma.salesReturn.update({
      where: { id: returnId, tenantId: tenantId },
      data: {
        status: ReturnStatus.REJECTED,
        reason: updatedReason,
        approvedBy: userId,
      },
    });
    this.logger.log(`Return ID: ${returnId} rejected successfully`);
    return rejectedReturn;
  }

  // Get Returns with filtering and pagination (not shown here for brevity)
  async getAllReturns(tenantId: string, filterDto: GetSalesReturnsFilterDto) {
    const page = Number(filterDto.page || 1);
    const limit = Number(filterDto.limit || 10);
    const skip = (page - 1) * limit;
    const { status, branchId, search } = filterDto;

    const whereClause: Prisma.SalesReturnWhereInput = {
      tenantId,
      ...(status && { status }),
      ...(branchId && { branchId }),
      ...(search && {
        retNumber: { contains: search, mode: 'insensitive' },
      }),
    };
    const [data, total] = await this.prisma.$transaction([
      this.prisma.salesReturn.findMany({
        where: whereClause,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' }, // Newest first
        include: {
          customer: { select: { name: true, phone: true } }, // Useful for dashboard tables
        },
      }),
      this.prisma.salesReturn.count({ where: whereClause }),
    ]);

    return {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOneReturn(returnId: string, tenantId: string) {
    const salesReturn = await this.prisma.salesReturn.findFirst({
      where: { id: returnId, tenantId },
      include: {
        items: {
          include: {
            product: { select: { name: true, sku: true } },
          },
        },
        customer: true,
        creditNotes: true,
        creator: { select: { first_name: true, last_name: true } },
        approver: { select: { first_name: true, last_name: true } },
      },
    });

    if (!salesReturn) {
      throw new SalesReturnNotFoundException(returnId);
    }

    return salesReturn;
  }

  // ======== Private Helper Methods ========
  private isRetryableTransactionError(error: unknown): boolean {
    if (!(error instanceof Prisma.PrismaClientKnownRequestError)) {
      return false;
    }

    // P2002: unique key conflict, P2034: transaction serialization conflict
    return error.code === 'P2002' || error.code === 'P2034';
  }

  private async runWithRetry<T>(
    operation: () => Promise<T>,
    maxRetries = 3,
  ): Promise<T> {
    for (let attempt = 0; ; attempt++) {
      try {
        return await operation();
      } catch (error) {
        if (!this.isRetryableTransactionError(error) || attempt >= maxRetries) {
          throw error;
        }

        this.logger.warn(
          `Retrying transaction after transient conflict (${attempt + 1}/${maxRetries})`,
        );
        await new Promise((resolve) => setTimeout(resolve, 25 * (attempt + 1)));
      }
    }
  }

  private async lockDocumentSequence(
    tx: Prisma.TransactionClient,
    key: string,
  ): Promise<void> {
    await tx.$executeRaw`
      SELECT pg_advisory_xact_lock(hashtext(${key}))
    `;
  }

  private validateReturnQuantities(
    returnItems: CreateSalesReturnDto['items'],
    invoiceItems: InvoiceItem[],
    alreadyReturnedMap: Map<string, number>,
  ) {
    for (const returnItem of returnItems) {
      const invoiceItem = invoiceItems.find(
        (item) => item.id === returnItem.invoiceItemId,
      );
      if (!invoiceItem) {
        this.logger.warn(
          `Invoice item not found for return item: ${returnItem.invoiceItemId}`,
        );
        throw new InvoiceItemNotFoundException(returnItem.invoiceItemId);
      }

      // Calculate remaining eligible quantity
      const previouslyReturnedQty =
        alreadyReturnedMap.get(returnItem.invoiceItemId) || 0;
      const remainingReturnableQty =
        Number(invoiceItem.quantity) - previouslyReturnedQty;

      if (returnItem.quantity > remainingReturnableQty) {
        this.logger.warn(
          `Return quantity exceeds purchased/remaining quantity for item: ${returnItem.invoiceItemId}`,
        );
        throw new ReturnQuantityExceededException(returnItem.invoiceItemId);
      }
    }
  }
  // TODO: Temporary workaround for sequential numbering.
  // TODO: Replace with ShopSettings-backed atomic counters per tenant/year.
  private async generateReturnNumber(
    tx: Prisma.TransactionClient,
    tenantId: string,
  ): Promise<string> {
    const year = new Date().getFullYear();
    const searchPrefix = `RET-${year}-`;

    await this.lockDocumentSequence(tx, `RET:${tenantId}:${year}`);

    const rows = await tx.$queryRaw<Array<{ value: string | null }>>`
      SELECT MAX(ret_number)::text AS value
      FROM sales_returns
      WHERE tenant_id = ${tenantId}::uuid
        AND ret_number LIKE ${searchPrefix + '%'}
    `;

    let nextNumber = 1;
    const lastReturn = rows[0]?.value;
    if (lastReturn) {
      const parsedNumber = parseInt(lastReturn.replace(searchPrefix, ''), 10);
      if (!isNaN(parsedNumber)) nextNumber = parsedNumber + 1;
    }
    return `${searchPrefix}${nextNumber.toString().padStart(5, '0')}`;
  }

  // TODO: Temporary workaround for sequential numbering.
  // TODO: Replace with ShopSettings-backed atomic counters per tenant/year.
  private async generateCreditNoteNumber(
    tx: Prisma.TransactionClient,
    tenantId: string,
  ): Promise<string> {
    const year = new Date().getFullYear();
    const searchPrefix = `CN-${year}-`;

    await this.lockDocumentSequence(tx, `CN:${tenantId}:${year}`);

    const rows = await tx.$queryRaw<Array<{ value: string | null }>>`
      SELECT MAX(credit_note_number)::text AS value
      FROM credit_notes
      WHERE tenant_id = ${tenantId}::uuid
        AND credit_note_number LIKE ${searchPrefix + '%'}
    `;

    let nextNumber = 1;
    const lastNote = rows[0]?.value;
    if (lastNote) {
      const parsedNumber = parseInt(lastNote.replace(searchPrefix, ''), 10);
      if (!isNaN(parsedNumber)) nextNumber = parsedNumber + 1;
    }
    return `${searchPrefix}${nextNumber.toString().padStart(5, '0')}`;
  }

  private mapReturnData(
    dto: CreateSalesReturnDto,
    retNumber: string,
    userId: string,
  ): Prisma.SalesReturnUncheckedCreateInput {
    return {
      retNumber,
      tenantId: dto.tenantId,
      branchId: dto.branchId,
      invoiceId: dto.invoiceId,
      customerId: dto.customerId,
      totalAmount: new Prisma.Decimal(dto.totalAmount),
      refundMethod: dto.refundMethod,
      reason: dto.returnReason,
      createdBy: userId,
      status: ReturnStatus.PENDING,

      items: {
        create: dto.items.map((item) => ({
          invoiceItemId: item.invoiceItemId,
          productId: item.productId,
          variantId: item.variantId,
          warehouseId: item.warehouseId,
          quantity: new Prisma.Decimal(item.quantity),
          condition: item.condition,
          unitPrice: new Prisma.Decimal(item.unitPrice),
          lineTotal: new Prisma.Decimal(item.lineTotal),
        })),
      },
    };
  }

  // ======= Complex Operations for Approving Returns ========
  private async getReturnWithItems(
    tx: Prisma.TransactionClient,
    returnId: string,
    tenantId: string,
  ): Promise<SalesReturnWithItems> {
    const salesReturn = await tx.salesReturn.findFirst({
      where: { id: returnId, tenantId: tenantId },
      include: { items: true },
    });

    if (!salesReturn) {
      throw new SalesReturnNotFoundException(
        `Sales return not found: ${returnId}`,
      );
    }

    return salesReturn;
  }

  private validateReturnIsPending(
    salesReturn: Pick<SalesReturnWithItems, 'id' | 'status'>,
  ): void {
    if (salesReturn.status !== ReturnStatus.PENDING) {
      throw new InvalidReturnStatusException(salesReturn.status);
    }
  }

  private async processReturnItems(
    tx: Prisma.TransactionClient,
    salesReturn: SalesReturnWithItems,
    userId: string,
  ) {
    for (const item of salesReturn.items) {
      this.logger.debug(
        `Updating stock for Product ID: ${item.productId}, Qty: ${item.quantity.toString()}`,
      );
      await this.updateStockLevels(tx, item);
      await this.recordStockMovement(tx, item, salesReturn, userId);
    }
  }

  private async processFinancials(
    tx: Prisma.TransactionClient,
    salesReturn: SalesReturn,
  ) {
    if (!salesReturn.customerId) return;

    const invoice = await tx.salesInvoice.findUnique({
      where: { id: salesReturn.invoiceId },
      select: { saleType: true, paymentStatus: true },
    });

    const isCreditSale = invoice?.saleType === 'CREDIT';

    if (isCreditSale) {
      if (salesReturn.refundMethod === RefundMethod.CASH) {
        this.logger.warn(
          `Explicitly approved CASH refund for CREDIT sale by user ${salesReturn.approvedBy}`,
        );
        throw new InvalidReturnStatusException(
          'CASH refunds for CREDIT sales must be approved by an Admin',
        );
      } else {
        await this.updateCustomerBalance(tx, salesReturn);

        if (salesReturn.refundMethod !== RefundMethod.ACCOUNT_DEDUCTION) {
          await tx.salesReturn.update({
            where: { id: salesReturn.id },
            data: { refundMethod: RefundMethod.ACCOUNT_DEDUCTION },
          });
          this.logger.log(
            `Changed refund method to ACCOUNT_DEDUCTION for Return ${salesReturn.id}`,
          );
        }

        return;
      }
    }

    // Normal flows for Cash Sales
    if (salesReturn.refundMethod === RefundMethod.CREDIT_NOTE) {
      await this.issueCreditNote(tx, salesReturn);
      await tx.customer.update({
        where: { id: salesReturn.customerId, tenantId: salesReturn.tenantId },
        data: { totalPurchases: { decrement: salesReturn.totalAmount } },
      });
    } else if (salesReturn.refundMethod === RefundMethod.ACCOUNT_DEDUCTION) {
      await this.updateCustomerBalance(tx, salesReturn);
    } else if (salesReturn.refundMethod === RefundMethod.EXCHANGE) {
      await this.issueCreditNote(tx, salesReturn);
      this.logger.log(
        `Exchange processed: Credit Note issued for Return ${salesReturn.id}`,
      );
    } else if (salesReturn.refundMethod === RefundMethod.CASH) {
      this.logger.log(
        `CASH refund of ${salesReturn.totalAmount.toString()} approved. Please dispense cash from till.`,
      );
    }
  }

  private async updateInvoiceStatus(
    tx: Prisma.TransactionClient,
    invoiceId: string,
  ) {
    const invoice = await tx.salesInvoice.findUnique({
      where: { id: invoiceId },
      include: { items: true },
    });

    if (!invoice) {
      throw new InvoiceNotFoundException(invoiceId);
    }

    const totalPurchasedQty = invoice.items.reduce(
      (sum, item) => sum + Number(item.quantity),
      0,
    );

    const allReturns = await tx.salesReturn.findMany({
      where: {
        invoiceId: invoiceId,
        status: { in: [ReturnStatus.APPROVED] },
      },
      include: { items: true },
    });

    const totalReturnedQty = allReturns.reduce((sum, ret) => {
      return (
        sum +
        ret.items.reduce((itemSum, item) => itemSum + Number(item.quantity), 0)
      );
    }, 0);

    if (totalReturnedQty >= totalPurchasedQty) {
      await tx.salesInvoice.update({
        where: { id: invoiceId },
        data: { status: InvoiceStatus.RETURNED },
      });
      this.logger.log(
        `Invoice ${invoiceId} fully returned. Status updated to RETURNED.`,
      );
    } else {
      await tx.salesInvoice.update({
        where: { id: invoiceId },
        data: { status: InvoiceStatus.COMPLETED },
      });
      this.logger.log(
        `Invoice ${invoiceId} partially returned. Status kept as COMPLETED.`,
      );
    }
  }

  private async markReturnAsApproved(
    tx: Prisma.TransactionClient,
    returnId: string,
    userId: string,
    tenantId: string,
  ) {
    return await tx.salesReturn.update({
      where: { id: returnId, tenantId: tenantId },
      data: {
        status: ReturnStatus.APPROVED,
        approvedBy: userId,
      },
      include: { creditNotes: true },
    });
  }

  private async updateStockLevels(
    tx: Prisma.TransactionClient,
    item: SalesReturnWithItems['items'][number],
  ) {
    const isGood = ReturnCondition.GOOD === item.condition;
    const Result = await tx.stock.updateMany({
      where: {
        productId: item.productId,
        variantId: item.variantId || null,
        warehouseId: item.warehouseId,
      },
      data: {
        // Directing to the correct inventory field based on condition
        quantity: isGood ? { increment: item.quantity } : undefined,
        damagedQuantity: !isGood ? { increment: item.quantity } : undefined,
      },
    });
    if (Result.count === 0) {
      this.logger.debug(
        `Stock record not found for Product ID: ${item.productId}, Warehouse ID: ${item.warehouseId}`,
      );
      throw new StockRecordNotFoundException(item.productId, item.warehouseId);
    }
  }

  private async recordStockMovement(
    tx: Prisma.TransactionClient,
    item: SalesReturnWithItems['items'][number],
    salesReturn: Pick<SalesReturnWithItems, 'id' | 'tenantId'>,
    userId: string,
  ) {
    await tx.stockMovement.create({
      data: {
        tenantId: salesReturn.tenantId,
        productId: item.productId,
        variantId: item.variantId,
        warehouseId: item.warehouseId,
        movementType: MovementType.RETURN,
        quantity: item.quantity,
        referenceType: 'sales_return',
        referenceId: salesReturn.id,
        notes: `Returned item in ${item.condition} condition`,
        createdBy: userId,
      },
    });
  }

  private async issueCreditNote(
    tx: Prisma.TransactionClient,
    salesReturn: SalesReturn,
  ) {
    const expiryDate = new Date();
    // TODO: Move credit-note expiry days to ShopSettings (POS-1234); keep 90-day default until settings table is available.
    // Currently hardcoded to 90 days as a temporary schema constraint workaround.
    expiryDate.setDate(expiryDate.getDate() + 90);

    const creditNoteNumber = await this.generateCreditNoteNumber(
      tx,
      salesReturn.tenantId,
    );

    const note = await tx.creditNote.create({
      data: {
        creditNoteNumber,
        tenantId: salesReturn.tenantId,
        customerId: salesReturn.customerId!,
        salesReturnId: salesReturn.id,
        amount: salesReturn.totalAmount,
        expiryDate,
        status: CreditNoteStatus.ISSUED,
      },
    });

    this.logger.log(`Credit Note Issued: ${creditNoteNumber}`);
    return note;
  }

  private async updateCustomerBalance(
    tx: Prisma.TransactionClient,
    salesReturn: SalesReturn,
  ) {
    await tx.customer.update({
      where: { id: salesReturn.customerId! },
      data: {
        totalPurchases: { decrement: salesReturn.totalAmount },
        outstandingBalance: { decrement: salesReturn.totalAmount },
      },
    });
    this.logger.log(`Account Deduction processed for Return ${salesReturn.id}`);
  }
}
