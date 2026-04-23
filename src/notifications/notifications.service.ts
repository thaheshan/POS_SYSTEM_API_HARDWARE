import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bull';
import type { Queue } from 'bull';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { SmsService } from './services/sms.service';
import IORedis from 'ioredis';
import { EmailService } from './services/email.service';
import { PdfService } from './services/pdf.service';

@Injectable()
export class NotificationsService implements OnModuleDestroy {
  private readonly logger = new Logger(NotificationsService.name);
  private readonly redis: IORedis;

  constructor(
    @InjectQueue('notifications') private notificationsQueue: Queue,
    private readonly prisma: PrismaService,
    private readonly smsService: SmsService,
    private readonly emailService: EmailService,
    private readonly pdfService: PdfService,
  ) {
    this.redis = new IORedis({
   host: process.env.REDIS_HOST!,
   port: Number(process.env.REDIS_PORT) || 6379,
   password: process.env.REDIS_PASSWORD!,
   tls: {},
   maxRetriesPerRequest: 3,
   enableReadyCheck: false,
   enableOfflineQueue: true,
   });

    this.redis.on('connect', () => {
      this.logger.log('Redis connected successfully');
    });

    this.redis.on('error', (err) => {
      this.logger.warn(`Redis error: ${err.message}`);
    });
  }

  async onModuleDestroy(): Promise<void> {
    await this.redis.quit();
  }

  // Low Stock Alert
  async sendLowStockAlert(
  tenantId: string,
  productId: string,
  productName: string,
  currentQty: number,
  minQty: number,
  ownerPhone: string,
): Promise<{ message: string; suppressed: boolean }> {  
  try {
    const redisKey = `alert_sent:${productId}`;

    this.logger.log(`Checking Redis key: ${redisKey}`);
    const exists = await this.redis.get(redisKey);
    this.logger.log(`Redis key exists: ${exists}`);

    if (exists) {
      this.logger.log(`Low stock alert suppressed for ${productId}`);
      return { message: 'Alert already sent. Suppressed until TTL expires.', suppressed: true }; 
    }

    const message = `ALERT: ${productName} stock low (${currentQty} units). Reorder: ${minQty * 4} units. - ABC Hardware`;

    await this.smsService.sendSms(
      ownerPhone,
      message,
      tenantId,
      'low_stock',
      productId,
    );

    await this.redis.setex(
      redisKey,
      Number(process.env.LOW_STOCK_ALERT_TTL || 7200),
      '1',
    );

    this.logger.log(`Low stock alert sent for ${productName}`);
    return { message: 'Low stock alert sent successfully', suppressed: false }; 
  } catch (error) {
    this.logger.error('Error sending low stock alert:', error instanceof Error ? error.message : 'Unknown error');
    throw error;
  }
}

  // Large Transaction Alert
  async sendLargeTransactionAlert(
    tenantId: string,
    amount: number,
    branchName: string,
    ownerPhone: string,
    invoiceId: string,
  ): Promise<void> {
    const threshold = Number(process.env.LARGE_TRANSACTION_THRESHOLD || 100000);
    if (amount < threshold) return;

    const message = `ALERT: Large transaction Rs.${amount.toLocaleString()} processed at Branch ${branchName} POS. - ABC Hardware`;

    await this.smsService.sendSms(
      ownerPhone,
      message,
      tenantId,
      'large_transaction',
      invoiceId,
    );

    this.logger.log(`Large transaction alert sent: Rs.${amount}`);
  }

  // Daily Summary SMS —  9:00pm
  @Cron('0 21 * * *')
  async sendDailySummary(): Promise<void> {
    try {
      this.logger.log('Daily summary cron triggered');

      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const ownerPhone = process.env.LOW_STOCK_ALERT_TO!;
      const message = `Daily Summary: - ABC Hardware`;

      await this.smsService.sendSms(
        ownerPhone,
        message,
        'system',
        'daily_summary',
      );

      this.logger.log('Daily summary SMS sent');
    } catch (error) {
      this.logger.error('Error sending daily summary:', error instanceof Error ? error.message : 'Unknown error');
    }
  }

  // Invoice Email
// Invoice Email with PDF
async sendInvoiceEmail(
  tenantId: string,
  customerEmail: string,
  invoiceId: string,
  invoiceNumber: string,
  grandTotal?: number,
): Promise<void> {
  try {
    // PDF generate
    const pdfBuffer = await this.pdfService.generateInvoicePdf({
      invoiceNumber,
      customerEmail,
      grandTotal,
    });

    await this.emailService.sendEmail(
      customerEmail,
      `Your Invoice from ABC Hardware — ${invoiceNumber}`,
      `
        <h2>Thank you for your purchase!</h2>
        <p>Invoice <strong>${invoiceNumber}</strong></p>
        <p>Please find your invoice attached.</p>
        <p>ABC Hardware</p>
      `,
      tenantId,
      'invoice_email',
      invoiceId,
      { filename: `invoice-${invoiceNumber}.pdf`, content: pdfBuffer },
    );

    this.logger.log(`Invoice email with PDF sent for ${customerEmail}`);
  } catch (error) {
    this.logger.error('Error sending invoice email:', error instanceof Error ? error.message : 'Unknown error');
    throw error;
  }
}

// Quotation Email with PDF
async sendQuotationEmail(
  tenantId: string,
  customerEmail: string,
  quotationId: string,
  quotationNumber: string,
  grandTotal?: number,
): Promise<void> {
  try {
    const pdfBuffer = await this.pdfService.generateQuotationPdf({
      quotationNumber,
      customerEmail,
      grandTotal,
    });

    await this.emailService.sendEmail(
      customerEmail,
      `Your Quotation from ABC Hardware — ${quotationNumber}`,
      `
        <h2>Please find your quotation attached.</h2>
        <p>Quotation <strong>${quotationNumber}</strong></p>
        <p>ABC Hardware</p>
      `,
      tenantId,
      'quotation_email',
      quotationId,
      { filename: `quotation-${quotationNumber}.pdf`, content: pdfBuffer },
    );

    this.logger.log(`Quotation email with PDF sent for ${customerEmail}`);
  } catch (error) {
    this.logger.error('Error sending quotation email:', error instanceof Error ? error.message : 'Unknown error');
    throw error;
  }
}

// Purchase Order Email with PDF
async sendPurchaseOrderEmail(
  tenantId: string,
  supplierEmail: string,
  poId: string,
  poNumber: string,
  grandTotal?: number,
): Promise<void> {
  try {
    const pdfBuffer = await this.pdfService.generatePurchaseOrderPdf({
      poNumber,
      supplierEmail,
      grandTotal,
    });

    await this.emailService.sendEmail(
      supplierEmail,
      `Purchase Order from ABC Hardware — ${poNumber}`,
      `
        <h2>Please find the purchase order attached.</h2>
        <p>PO Number: <strong>${poNumber}</strong></p>
        <p>ABC Hardware</p>
      `,
      tenantId,
      'purchase_order_email',
      poId,
      { filename: `po-${poNumber}.pdf`, content: pdfBuffer },
    );

    this.logger.log(`PO email with PDF sent for ${supplierEmail}`);
  } catch (error) {
    this.logger.error('Error sending PO email:', error instanceof Error ? error.message : 'Unknown error');
    throw error;
  }
}

  // Welcome Email
  async sendWelcomeEmail(
    tenantId: string,
    staffEmail: string,
    staffName: string,
  ): Promise<void> {
    try {
      await this.notificationsQueue.add(
        'send_email',
        {
          to: staffEmail,
          subject: 'Welcome to ABC Hardware!',
          html: `
            <h2>Welcome, ${staffName}!</h2>
            <p>Your account has been created successfully.</p>
            <p>ABC Hardware Team</p>
          `,
          tenantId,
          event: 'welcome_email',
        },
        { attempts: 3, backoff: { type: 'exponential', delay: 5000 } },
      );

      this.logger.log(`Welcome email queued for ${staffEmail}`);
    } catch (error) {
      this.logger.error('Error sending welcome email:', error instanceof Error ? error.message : 'Unknown error');
      throw error;
    }
  }

  // Tax Payment Reminder — check every day at 9:00am
@Cron('0 9 * * *')
async checkTaxPaymentReminder(): Promise<void> {
  try {
    this.logger.log('Tax payment reminder check triggered');

    const ownerPhone = process.env.LOW_STOCK_ALERT_TO!;

    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const vatData = await this.prisma.dailyTaxTracking.aggregate({
      where: {
        date: { gte: startOfMonth },
      },
      _sum: { netVatPayable: true },
    });

    const estimatedVat = vatData._sum.netVatPayable || 0;

    const message = `REMINDER: VAT payment due in 7 days. Estimated payable: Rs. ${estimatedVat.toLocaleString()}. - ABC Hardware`;

    await this.smsService.sendSms(
      ownerPhone,
      message,
      'system',
      'tax_reminder',
    );

    this.logger.log('Tax payment reminder SMS sent');
  } catch (error) {
    this.logger.error('Error sending tax reminder:', error instanceof Error ? error.message : 'Unknown error');
  }
}

async sendTaxReminderSms(
  ownerPhone: string,
  message: string,
  tenantId: string,
): Promise<void> {
  await this.smsService.sendSms(
    ownerPhone,
    message,
    tenantId,
    'tax_reminder',
  );
  this.logger.log('Tax reminder SMS sent');
}
}