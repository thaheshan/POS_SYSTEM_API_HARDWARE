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

const VAT_RATE = 18;

@Injectable()
export class InvoicesService {
  private readonly logger = new Logger(InvoicesService.name);

  constructor(private readonly prisma: PrismaService) {}

  // POST /sales/invoices
  async create(dto: CreateInvoiceDto) {
    // 1. VAT calculate කරනවා
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

    // 2. Payment validation — split payment sum check
    // 2. Payment validation
const payment_total = dto.payments.reduce((sum, p) => sum + p.amount, 0);
const hasCashOnly = dto.payments.every((p) => p.payment_method === 'cash');

if (hasCashOnly) {
  // Cash sale — overpayment allowed
  if (payment_total < grand_total - 0.01) {
    throw new BadRequestException(
      `Cash amount (${payment_total}) is less than grand total (${grand_total})`,
    );
  }
} else {
  // Card / Split — exact match required
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
      // 4. Transaction — atomic operation
      return await this.prisma.$transaction(async (tx) => {
        // 4.1 Invoice create
        const invoice = await tx.salesInvoice.create({
          data: {
            invoice_number,
            tenant_id: dto.tenant_id,
            branch_id: dto.branch_id,
            cashier_id: dto.cashier_id,
            customer_id: dto.customer_id,
            subtotal,
            discount_total,
            vat_total,
            grand_total,
            status: 'completed',
          },
        });

        // 4.2 Invoice items create
        await tx.salesInvoiceItem.createMany({
          data: calculatedItems.map((item) => ({
            ...item,
            invoice_id: invoice.id,
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
            invoice_id: invoice.id,
            payment_method: p.payment_method,
            amount: p.amount,
            reference: p.reference,
          })),
        });

        // 4.5 Cash change calculate
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
    } catch (error) {
      if (error instanceof BadRequestException) throw error;
      this.logger.error('Failed to create invoice', error);
      throw new InternalServerErrorException('Failed to create invoice');
    }
  }

  // GET /sales/invoices
  async findAll(filters: {
    date?: string;
    branch_id?: string;
    cashier_id?: string;
    status?: string;
  }) {
    return this.prisma.salesInvoice.findMany({
      where: {
        branch_id: filters.branch_id,
        cashier_id: filters.cashier_id,
        status: filters.status,
        created_at: filters.date
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
      orderBy: { created_at: 'desc' },
    });
  }

  // GET /sales/invoices/:id
  async findOne(id: string) {
    const invoice = await this.prisma.salesInvoice.findUnique({
      where: { id },
      include: { items: true, payments: true },
    });
    if (!invoice) throw new NotFoundException('Invoice not found');
    return invoice;
  }
}