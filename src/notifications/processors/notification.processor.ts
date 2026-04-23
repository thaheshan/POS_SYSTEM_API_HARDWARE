import { Process, Processor } from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import type { Job } from 'bull';
import { SmsService } from '../services/sms.service';
import { EmailService } from '../services/email.service';

@Processor('notifications')
export class NotificationProcessor {
  private readonly logger = new Logger(NotificationProcessor.name);

  constructor(
    private readonly smsService: SmsService,
    private readonly emailService: EmailService,
  ) {}

  @Process('send_sms')
  async handleSms(job: Job) {
    const { to, message, tenantId, event, referenceId } = job.data;
    this.logger.log(`Processing SMS job: ${event}`);
    await this.smsService.sendSms(to, message, tenantId, event, referenceId);
  }

  @Process('send_email')
  async handleEmail(job: Job) {
    const { to, subject, html, tenantId, event, referenceId, attachment } = job.data;
    this.logger.log(`Processing Email job: ${event}`);
    await this.emailService.sendEmail(to, subject, html, tenantId, event, referenceId, attachment);
  }
}