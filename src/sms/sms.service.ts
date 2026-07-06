import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';

@Injectable()
export class SmsService {
  private readonly logger = new Logger(SmsService.name);

  private readonly API_URL    = 'https://app.text.lk/api/v3/sms/send';
  private readonly API_TOKEN  = '5712|3BWcH4C9bFA69kplnjXmXlauJmxG1HIsPuXef5RF1eafd116';
  private readonly SENDER_ID  = 'TextLKDemo';
  private readonly SHOP_NAME  = 'Futura Hardware';
  private readonly RECEIPT_BASE_URL = process.env.FRONTEND_RECEIPT_URL || 'https://pos-system-web-hardware-gdxu.vercel.app';

  /**
   * Normalise a Sri Lankan phone number to 947XXXXXXXX format.
   * Handles: 07XXXXXXXX  →  947XXXXXXXX
   *          7XXXXXXXX   →  947XXXXXXXX
   *          947XXXXXXXX →  unchanged
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
   * Send an SMS receipt link to the customer.
   * This is fire-and-forget — it will NEVER throw so it cannot fail a checkout.
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

    this.logger.log(`[SMS] Sending to ${formattedPhone} for invoice ${invoiceId}`);

    try {
      const response = await axios.post(
        this.API_URL,
        {
          recipient: formattedPhone,
          sender_id: this.SENDER_ID,
          type:      'plain',        // ← required by text.lk API v3
          message,
        },
        {
          headers: {
            Authorization: `Bearer ${this.API_TOKEN}`,
            'Content-Type': 'application/json',
            Accept:         'application/json',
          },
          timeout: 8000, // don't block checkout for more than 8 s
        },
      );

      this.logger.log(
        `[SMS] ✓ Delivered to ${formattedPhone} — status: ${response.status}, data: ${JSON.stringify(response.data)}`,
      );
      require('fs').appendFileSync('sms-debug.txt', `SUCCESS: Sent to ${formattedPhone}. Response: ${JSON.stringify(response.data)}\n`);
    } catch (error: any) {
      // Log the full text.lk error response so you can debug from the console
      const errData = error?.response?.data ?? error?.message;
      this.logger.error(`[SMS] ✗ Failed for ${formattedPhone}: ` + JSON.stringify(errData));
      require('fs').appendFileSync('sms-debug.txt', `ERROR: Failed for ${formattedPhone}. Details: ${JSON.stringify(errData)}\n`);
      // Intentionally NOT re-throwing — SMS failure must never break checkout
    }
  }
}
