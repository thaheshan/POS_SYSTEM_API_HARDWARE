import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class SmsService {
  private readonly logger = new Logger(SmsService.name);

  constructor(private readonly prisma: PrismaService) {}

  async sendSms(
    to: string,
    message: string,
    tenantId: string,
    event: string,
    referenceId?: string,
  ): Promise<void> {
    // Phone format validate — 94XXXXXXXXX
    const phone = to.replace(/^\+/, '').replace(/^0/, '94');

    try {
      await axios.post('https://app.notify.lk/api/v1/send', {
        user_id: process.env.NOTIFY_USER_ID,
        api_key: process.env.NOTIFY_API_KEY,
        sender_id: process.env.NOTIFY_SENDER_ID,
        to: phone,
        message,
      });

      // Log notification
      await this.prisma.notification.create({
        data: {
          tenantId,
          type: 'sms',
          event,
          recipient: phone,
          message,
          status: 'sent',
          referenceId,
        },
      });

      this.logger.log(`SMS sent to ${phone} — ${event}`);
    } catch (error) {
      // Log failed notification
      await this.prisma.notification.create({
        data: {
          tenantId,
          type: 'sms',
          event,
          recipient: phone,
          message,
          status: 'failed',
          referenceId,
        },
      });

      this.logger.error(`SMS failed to ${phone}`, error);
    }
  }
}