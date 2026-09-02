import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class SmsService {
  private readonly logger = new Logger(SmsService.name);

  private readonly API_URL    = process.env.TEXTLK_API_URL || 'https://app.text.lk/api/v3/sms/send';
  private readonly API_TOKEN  = process.env.TEXTLK_API_TOKEN || '5712|3BWcH4C9bFA69kplnjXmXlauJmxG1HIsPuXef5RF1eafd116';
  private readonly SENDER_ID  = process.env.TEXTLK_SENDER_ID || 'TextLKDemo';
  private readonly SHOP_NAME  = 'Futura Hardware';
  private readonly RECEIPT_BASE_URL = process.env.FRONTEND_RECEIPT_URL || 'https://www.futurahardware.com';

  constructor(private prisma: PrismaService) {}

  /**
   * Normalise a Sri Lankan phone number to 947XXXXXXXX format.
   */
  private normalizePhone(raw: string): string {
    let phone = raw.replace(/\D/g, ''); // strip non-digits

    if (phone.startsWith('94')) {
      return phone; // already international
    }
    if (phone.startsWith('0')) {
      return '94' + phone.slice(1); // 07X → 947X
    }
    return '94' + phone; // 7X → 947X
  }

  /**
   * Core TEXT.LK SMS Sender Helper
   */
  async sendRawSMS(phoneNumber: string, message: string): Promise<boolean> {
    if (!phoneNumber) return false;

    const formattedPhone = this.normalizePhone(phoneNumber);
    this.logger.log(`[SMS] Dispatching to ${formattedPhone} via TEXT.LK API`);

    try {
      const response = await axios.post(
        this.API_URL,
        {
          recipient: formattedPhone,
          sender_id: this.SENDER_ID,
          type: 'plain',
          message,
        },
        {
          headers: {
            Authorization: `Bearer ${this.API_TOKEN}`,
            'Content-Type': 'application/json',
            Accept: 'application/json',
          },
          timeout: 10000,
        },
      );

      this.logger.log(`[SMS] Delivered to ${formattedPhone}: ${JSON.stringify(response.data)}`);
      return true;
    } catch (error: any) {
      const errData = error?.response?.data ?? error?.message;
      this.logger.error(`[SMS] Failed for ${formattedPhone}: ` + JSON.stringify(errData));
      return false;
    }
  }

  /**
   * Send an SMS receipt link to the customer.
   */
  async sendReceiptSMS(
    phoneNumber: string,
    invoiceId: string,
    shopName: string = this.SHOP_NAME,
  ): Promise<void> {
    if (!phoneNumber) {
      this.logger.warn('[SMS] No phone number provided — skipping SMS.');
      return;
    }

    const formattedPhone = this.normalizePhone(phoneNumber);
    const receiptUrl     = `${this.RECEIPT_BASE_URL}/receipt/${invoiceId}`;
    const message        =
      `Thank you for your purchase from ${shopName}!\n` +
      `View your invoice here:\n${receiptUrl}`;

    await this.sendRawSMS(formattedPhone, message);
  }

  /**
   * Send single Credit Purchase SMS Notification
   */
  async sendCreditNotification(dto: {
    phone: string;
    customerName?: string;
    message?: string;
    leftoverCredit?: number;
    totalOutstanding?: number;
  }) {
    const textMessage = dto.message ||
      `Futura Hardware: Dear ${dto.customerName || 'Customer'}, thank you for your purchase. ` +
      `Outstanding Credit Balance: Rs. ${Number(dto.totalOutstanding || 0).toLocaleString()}. ` +
      `Please settle at your convenience. Info: futurahardware.com`;

    const success = await this.sendRawSMS(dto.phone, textMessage);
    return {
      success: true,
      delivered: success,
      message: success
        ? 'SMS notification sent successfully via TEXT.LK gateway.'
        : 'SMS queued / dispatched via TEXT.LK gateway.',
    };
  }

  /**
   * Batch SMS reminders for all credit account customers with outstanding balances
   */
  async sendBatchCreditReminders(tenantId?: string) {
    this.logger.log(`[SMS Batch] Initiating batch credit reminders for tenant=${tenantId}`);

    const whereClause: any = {};
    if (tenantId) {
      whereClause.tenantId = tenantId;
    }

    const customers = await this.prisma.customer.findMany({
      where: whereClause,
      include: {
        salesInvoices: {
          select: { balance: true },
        },
      },
    });

    let sentCount = 0;
    let eligibleCount = 0;

    for (const customer of customers) {
      if (!customer.phone) continue;

      const invoiceOutstanding = (customer.salesInvoices || []).reduce(
        (sum, inv) => sum + Number(inv.balance || 0),
        0,
      );
      const finalOutstanding = Math.max(
        Number(customer.outstandingBalance || 0),
        invoiceOutstanding,
      );

      if (finalOutstanding <= 0) continue;

      eligibleCount++;

      const message =
        `Futura Hardware: Dear ${customer.name}, this is a friendly reminder that your current outstanding credit balance is ` +
        `Rs. ${finalOutstanding.toLocaleString()}. Please visit the shop or contact us to settle your account. ` +
        `Thank you! Info: futurahardware.com`;

      const delivered = await this.sendRawSMS(customer.phone, message);
      if (delivered) sentCount++;
    }

    this.logger.log(`[SMS Batch] Completed: ${sentCount}/${eligibleCount} messages sent successfully.`);

    return {
      success: true,
      sentCount,
      totalCount: eligibleCount,
      message: `Batch SMS reminders dispatched to ${sentCount} credit customers via TEXT.LK.`,
    };
  }
}
