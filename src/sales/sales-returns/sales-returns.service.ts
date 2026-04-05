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
} from './exceptions/sales-return.exceptions';
import { InvoiceItem } from './interfaces/sales-return.interfaces';

type SalesReturnWithItems = Prisma.SalesReturnGetPayload<{
  include: { items: true };
}>;

@Injectable()
export class SalesReturnsService {
  private readonly logger = new Logger(SalesReturnsService.name);
  constructor(private readonly prisma: PrismaService) {}

  // ======== Public Methods ========
  // Create return request
  async createReturnRequest(dto: CreateSalesReturnDto, userId: string) {
    this.logger.log(`Starting return creation for Invoice: ${dto.invoiceId}`);

    return await this.prisma.$transaction(async (tx) => {
      const invoice = await tx.salesInvoice.findUnique({
        where: { id: dto.invoiceId },
        include: { items: true },
      });

      if (!invoice) {
        this.logger.warn(`Invoice not found: ${dto.invoiceId}`);
        throw new InvoiceNotFoundException(dto.invoiceId);
      }
      this.validateReturnQuantities(dto.items, invoice.items as InvoiceItem[]);

      const retNumber = this.generateDocumentNumber('RET');
      const mappedData = this.mapReturnData(dto, retNumber, userId);

      const newReturn = await tx.salesReturn.create({
        data: mappedData,
        include: { items: true },
      });
      this.logger.log(`Return created successfully with ID: ${newReturn.id}`);
      return newReturn;
    });
  }

  // Approve return request
  async approveReturn(returnId: string, userId: string) {
    this.logger.log(`Approving Return ID: ${returnId} by User: ${userId}`);

    return await this.prisma.$transaction(async (tx) => {
      const salesReturn = await this.getReturnWithItems(tx, returnId);
      this.validateReturnIsPending(salesReturn);

      await this.processReturnItems(tx, salesReturn, userId);
      await this.processFinancials(tx, salesReturn);
      await this.updateInvoiceStatus(tx, salesReturn.invoiceId);
      return await this.markReturnAsApproved(tx, returnId, userId);
    });
  }

  // ======== Private Helper Methods ========
  private validateReturnQuantities(
    returnItems: CreateSalesReturnDto['items'],
    invoiceItems: InvoiceItem[],
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
      if (returnItem.quantity > Number(invoiceItem.quantity)) {
        this.logger.warn(
          `Return quantity exceeds purchased quantity for item: ${returnItem.invoiceItemId}`,
        );
        throw new ReturnQuantityExceededException(returnItem.invoiceItemId);
      }
    }
  }

  private calculateReturnTotals(
    items: { lineTotal: string; taxAmount: string }[],
  ) {
    const subtotal = items.reduce(
      (sum, item) => sum + Number(item.lineTotal),
      0,
    );
    const taxAmount = items.reduce(
      (sum, item) => sum + Number(item.taxAmount || 0),
      0,
    );
    const totalAmount = subtotal + taxAmount;

    return { subtotal, taxAmount, totalAmount };
  }

  private generateDocumentNumber(prefix: string): string {
    const year = new Date().getFullYear();
    const uniqueSuffix = Date.now().toString().slice(-5);
    return `${prefix}-${year}-${uniqueSuffix}`;
  }

  private mapReturnData(
    dto: CreateSalesReturnDto,
    retNumber: string,
    userId: string,
  ) {
    return {
      retNumber,
      tenantId: dto.tenantId,
      branchId: dto.branchId,
      invoiceId: dto.invoiceId,
      customerId: dto.customerId,
      returnDate: new Date(),
      returnType: dto.returnType,
      subtotal: dto.subtotal,
      taxAmount: dto.taxAmount,
      totalAmount: dto.totalAmount,
      refundMethod: dto.refundMethod,
      returnReason: dto.returnReason,
      processedBy: userId,
      status: ReturnStatus.PENDING,

      items: {
        create: dto.items.map((item) => ({
          invoiceItemId: item.invoiceItemId,
          productId: item.productId,
          variantId: item.variantId,
          warehouseId: item.warehouseId,
          quantity: item.quantity,
          condition: item.condition,
          unitPrice: item.unitPrice,
          lineTotal: item.lineTotal,
        })),
      },
    };
  }

  // ======= Complex Operations for Approving Returns ========
  private async getReturnWithItems(
    tx: Prisma.TransactionClient,
    returnId: string,
  ): Promise<SalesReturnWithItems> {
    const salesReturn = await tx.salesReturn.findUnique({
      where: { id: returnId },
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
        // Default behavior for credit sales: force account deduction
        await this.updateCustomerBalance(tx, salesReturn);
        return; // Stop here so we don't issue credit notes
      }
    }

    // Normal flows for Cash Sales
    if (salesReturn.refundMethod === RefundMethod.CREDIT_NOTE) {
      await this.issueCreditNote(tx, salesReturn);
      await tx.customer.update({
        where: { id: salesReturn.customerId },
        data: { totalPurchases: { decrement: salesReturn.totalAmount } },
      });
    } else if (salesReturn.refundMethod === RefundMethod.ACCOUNT_DEDUCTION) {
      await this.updateCustomerBalance(tx, salesReturn);
    }
  }

  private async updateInvoiceStatus(
    tx: Prisma.TransactionClient,
    invoiceId: string,
  ) {
    await tx.salesInvoice.update({
      where: { id: invoiceId },
      data: { status: InvoiceStatus.RETURNED },
    });
  }

  private async markReturnAsApproved(
    tx: Prisma.TransactionClient,
    returnId: string,
    userId: string,
  ) {
    return await tx.salesReturn.update({
      where: { id: returnId },
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
    await tx.stock.updateMany({
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
    expiryDate.setDate(expiryDate.getDate() + 90);

    const creditNoteNumber = this.generateDocumentNumber('CN');

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
