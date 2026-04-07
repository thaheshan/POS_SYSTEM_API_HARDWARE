import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';

@Injectable()
export class SmsService {
  private readonly logger = new Logger(SmsService.name);

  constructor(private readonly config: ConfigService) {}

  async sendLowStockAlert(
    productId: string,
    currentQuantity: number,
    minimumQuantity: number,
    warehouseId: string,
  ): Promise<void> {
    const message =
      `LOW STOCK ALERT! ` +
      `Product: ${productId} | ` +
      `Warehouse: ${warehouseId} | ` +
      `Current: ${currentQuantity} | ` +
      `Minimum: ${minimumQuantity} | ` +
      `Please reorder immediately.`;

    try {
      const response = await axios.get('https://app.notify.lk/api/v1/send', {
        params: {
          user_id: this.config.get('NOTIFY_USER_ID'),
          api_key: this.config.get('NOTIFY_API_KEY'),
          sender_id: this.config.get('NOTIFY_SENDER_ID'),
          to: this.config.get('LOW_STOCK_ALERT_TO'),
          message,
        },
      });

      this.logger.log(
        `SMS API Response: ${JSON.stringify(response.data)}`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to send SMS for product ${productId}`,
        error,
      );
    }
  }
}