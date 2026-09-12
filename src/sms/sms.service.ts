import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class SmsService {
  private readonly logger = new Logger(SmsService.name);

  private readonly API_URL    = process.env.TEXTLK_API_URL || process.env.TEXT_LK_API_URL || 'https://app.text.lk/api/v3/sms/send';
  private readonly API_TOKEN  = process.env.TEXTLK_API_TOKEN || process.env.TEXT_LK_API_TOKEN || process.env.TEXT_LK_API_KEY || '5712|3BWcH4C9bFA69kplnjXmXlauJmxG1HIsPuXef5RF1eafd116';
  private readonly SENDER_ID  = process.env.TEXTLK_SENDER_ID || process.env.TEXT_LK_SENDER_ID || 'TrincoHW';
  private readonly SHOP_NAME  = 'Trinco Hardware & Electricals';
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
   * Helper to fetch live Shop details from database
   */
  private async getShopDetails(tenantId?: string) {
    try {
      if (tenantId) {
        const shop = await this.prisma.shop.findUnique({ where: { id: tenantId } });
        if (shop) return shop;
      }
      const firstShop = await this.prisma.shop.findFirst();
      if (firstShop) return firstShop;
    } catch (e) {
      this.logger.warn('[SMS] Could not fetch shop details from DB:', e);
    }
    return {
      name: 'Trinco Hardware & Electricals',
      address: 'Anuradapura Junction, Trincomalee, Sri Lanka',
      phone: '+94763539351',
    };
  }

  /**
   * Send an SMS receipt link to the customer.
   */
  async sendReceiptSMS(
    phoneNumber: string,
    invoiceId: string,
    shopName?: string,
  ): Promise<void> {
    if (!phoneNumber) {
      this.logger.warn('[SMS] No phone number provided — skipping SMS.');
      return;
    }

    const shop = await this.getShopDetails();
    const activeShopName = shopName || shop.name || 'Trinco Hardware & Electricals';
    const formattedPhone = this.normalizePhone(phoneNumber);
    const receiptUrl     = `${this.RECEIPT_BASE_URL}/receipt/${invoiceId}`;
    const message        =
      `Thank you for your purchase from ${activeShopName}!\n` +
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
    tenantId?: string;
  }) {
    const shop = await this.getShopDetails(dto.tenantId);
    const shopName = shop.name || 'Trinco Hardware & Electricals';
    const shopPhone = shop.phone || '+94763539351';

    const textMessage = dto.message ||
      `${shopName}: Dear ${dto.customerName || 'Customer'}, thank you for your purchase. ` +
      `Outstanding Credit Balance: Rs. ${Number(dto.totalOutstanding || 0).toLocaleString()}. ` +
      `Please settle at your convenience. Tel: ${shopPhone}`;

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

    const shop = await this.getShopDetails(tenantId);
    const shopName = shop.name || 'Trinco Hardware & Electricals';
    const shopPhone = shop.phone || '+94763539351';

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
        `${shopName}: Dear ${customer.name}, this is a friendly reminder that your current outstanding credit balance is ` +
        `Rs. ${finalOutstanding.toLocaleString()}. Please visit the shop or contact us to settle your account. ` +
        `Tel: ${shopPhone}`;

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
