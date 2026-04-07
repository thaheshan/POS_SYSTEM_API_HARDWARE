import {
  Injectable,
  BadRequestException,
  NotFoundException,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateInvoiceDto } from './dto/create-invoice.dto';
import { generateInvoiceNumber } from '../utils/invoice-number';
import { deductStockPerItem } from '../utils/stock-helper';
import { SmsService } from '../../common/sms/sms.service';

const VAT_RATE = 18;

@Injectable()
export class InvoicesService {
  private readonly logger = new Logger(InvoicesService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly smsService: SmsService,
  ) {}

  async create(dto: CreateInvoiceDto) {
    // 0. Minimum selling price check
    await this.validateMinimumSellingPrice(dto.items);

    // 1. VAT calculate
    let subtotal = 0;
    let vat_total = 0;

    const calculatedItems = dto.items.map((item) => {
      const line_total = item.quantity * item.unit_price - (item.discount || 0);
      const line_tax =
        item.tax_category === 'standard_vat'
          ? line_total * (VAT_RATE / 100)
          : 0;
      const profit = (item.unit_price - item.cost_price) * item.quantity;

      subtotal += line_total;
      vat_total += line_tax;

      return {
        product_id: item.product_id,
        quantity: item.quantity,
        unit_price: item.unit_price,
        cost_price: item.cost_price,
        line_total,
        line_tax,
        profit,
        tax_category: item.tax_category,
      };
    });

    const discount_total = dto.discount_total || 0;
    const grand_total = subtotal + vat_total - discount_total;

    // 0.1 Credit sale validation
    if (dto.customer_id) {
      await this.validateCreditSale(
        dto.customer_id,
        grand_total,
        dto.payments,
      );
    }

    // 2. Payment validation
    const payment_total = dto.payments.reduce((sum, p) => sum + p.amount, 0);
    const hasCashOnly = dto.payments.every((p) => p.payment_method === 'cash');

    if (hasCashOnly) {
      if (payment_total < grand_total - 0.01) {
        throw new BadRequestException(
          `Cash amount (${payment_total}) is less than grand total (${grand_total})`,
        );
      }
    } else {
      if (Math.abs(payment_total - grand_total) > 0.01) {
        throw new BadRequestException(
          `Payment total (${payment_total}) must equal grand total (${grand_total})`,
        );
      }
    }

    // 3. Invoice number generate
    const invoice_number = await generateInvoiceNumber(
      this.prisma,
      dto.branch_code,
    );

    try {
      const result = await this.prisma.$transaction(async (tx) => {
        // 4.1 Invoice create
        const invoice = await tx.salesInvoice.create({
          data: {
            invoiceNumber: invoice_number,
            tenantId: dto.tenant_id,
            branchId: dto.branch_id,
            cashierId: dto.cashier_id,
            customerId: dto.customer_id,
            subtotal,
            discountTotal: discount_total,
            vatTotal: vat_total,
            grandTotal: grand_total,
            status: 'completed',
          },
        });

        // 4.2 Invoice items create
        await tx.salesInvoiceItem.createMany({
          data: calculatedItems.map((item) => ({
            invoiceId: invoice.id,
            productId: item.product_id,
            quantity: item.quantity,
            unitPrice: item.unit_price,
            costPrice: item.cost_price,
            lineTotal: item.line_total,
            lineTax: item.line_tax,
            profit: item.profit,
            taxCategory: item.tax_category,
          })),
        });

        // 4.3 Stock deduct + movements
        if (dto.warehouse_id) {
          await deductStockPerItem(
            tx,
            dto.items.map((item) => ({
              product_id: item.product_id,
              quantity: item.quantity,
              warehouse_id: dto.warehouse_id!,
              tenant_id: dto.tenant_id,
            })),
            invoice.id,
          );
        }

        // 4.4 Payments create
        await tx.payment.createMany({
          data: dto.payments.map((p) => ({
            invoiceId: invoice.id,
            paymentMethod: p.payment_method,
            amount: p.amount,
            reference: p.reference,
          })),
        });

        // 4.5 Customer balance update
        const hasCreditPayment = dto.payments.some(
          (p) => p.payment_method === 'credit',
        );

        if (dto.customer_id && hasCreditPayment) {
          await tx.customer.update({
            where: { id: dto.customer_id },
            data: {
              outstandingBalance: { increment: grand_total },
              totalPurchases: { increment: grand_total },
            },
          });
        }

        // 4.6 Cash change calculate
        const cashPayment = dto.payments.find(
          (p) => p.payment_method === 'cash',
        );
        const change_amount = cashPayment
          ? cashPayment.amount - grand_total
          : 0;

        this.logger.log(`Invoice ${invoice_number} created`);

        return {
          ...invoice,
          items: calculatedItems,
          payments: dto.payments,
          change_amount: change_amount > 0 ? change_amount : 0,
        };
      });

      // Low-stock check — after transaction
      if (dto.warehouse_id) {
        await this.checkLowStock(dto.items, dto.warehouse_id);
      }

      return result;
    } catch (error) {
      if (error instanceof BadRequestException) throw error;
      this.logger.error('Failed to create invoice', error);
      throw new InternalServerErrorException('Failed to create invoice');
    }
  }

  async findAll(filters: {
    date?: string;
    branch_id?: string;
    cashier_id?: string;
    status?: string;
  }) {
    return this.prisma.salesInvoice.findMany({
      where: {
        branchId: filters.branch_id,
        cashierId: filters.cashier_id,
        status: filters.status,
        createdAt: filters.date
          ? {
              gte: new Date(filters.date),
              lte: new Date(
                new Date(filters.date).setDate(
                  new Date(filters.date).getDate() + 1,
                ),
              ),
            }
          : undefined,
      },
      include: { items: true, payments: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string) {
    const invoice = await this.prisma.salesInvoice.findUnique({
      where: { id },
      include: { items: true, payments: true },
    });
    if (!invoice) throw new NotFoundException('Invoice not found');
    return invoice;
  }

  private async validateMinimumSellingPrice(items: any[]): Promise<void> {
    for (const item of items) {
      const product = await this.prisma.product.findUnique({
        where: { id: item.product_id },
        select: {
          name: true,
          minimumSellingPrice: true,
        },
      });

      if (!product) {
        throw new BadRequestException(
          `Product ${item.product_id} not found`,
        );
      }

      if (
        product.minimumSellingPrice &&
        item.unit_price < Number(product.minimumSellingPrice)
      ) {
        throw new BadRequestException(
          `Product "${product.name}" minimum selling price is ` +
          `LKR ${product.minimumSellingPrice}. ` +
          `Cannot sell at LKR ${item.unit_price}.`,
        );
      }
    }
  }

  private async validateCreditSale(
    customerId: string,
    invoiceTotal: number,
    payments: any[],
  ): Promise<void> {
    const hasCreditPayment = payments.some(
      (p) => p.payment_method === 'credit',
    );

    if (!hasCreditPayment) return;

    const customer = await this.prisma.customer.findUnique({
      where: { id: customerId },
      select: {
        name: true,
        creditLimit: true,
        outstandingBalance: true,
      },
    });

    if (!customer) {
      throw new BadRequestException(
        `Customer ${customerId} not found`,
      );
    }

    if (Number(customer.creditLimit) <= 0) {
      throw new BadRequestException(
        `Customer "${customer.name}" is not eligible for credit sales`,
      );
    }

    const newBalance = Number(customer.outstandingBalance) + invoiceTotal;

    if (newBalance > Number(customer.creditLimit)) {
      throw new BadRequestException(
        `Credit limit exceeded for "${customer.name}". ` +
        `Limit: LKR ${customer.creditLimit}, ` +
        `Outstanding: LKR ${customer.outstandingBalance}, ` +
        `Invoice: LKR ${invoiceTotal}`,
      );
    }
  }

  private async checkLowStock(
    items: any[],
    warehouse_id: string,
  ): Promise<void> {
    for (const item of items) {
      const stock = await this.prisma.stock.findUnique({
        where: {
          warehouseId_productId: {
            warehouseId: warehouse_id,
            productId: item.product_id,
          },
        },
      });

      if (!stock) continue;

      const product = await this.prisma.product.findUnique({
        where: { id: item.product_id },
        select: { minimumStockLevel: true },
      });

      if (!product?.minimumStockLevel) continue;

      // Stock ≤ minimum , send SMS
      if (stock.quantity <= Number(product.minimumStockLevel)) {
        await this.smsService.sendLowStockAlert(
          item.product_id,
          Number(stock.quantity),
          Number(product.minimumStockLevel),
          warehouse_id,
        );
      }
    }
  }
}