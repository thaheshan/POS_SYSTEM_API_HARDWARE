import { Injectable, Logger } from '@nestjs/common';
import * as nodemailer from 'nodemailer';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);

  constructor(private readonly prisma: PrismaService) {}

  private getTransporter() {
    return nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT),
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASSWORD,
      },
    });
  }

  async sendEmail(
    to: string,
    subject: string,
    html: string,
    tenantId: string,
    event: string,
    referenceId?: string,
    attachment?: { filename: string; content: Buffer },
  ): Promise<void> {
    try {
      const transporter = this.getTransporter();

      await transporter.sendMail({
        from: process.env.EMAIL_FROM,
        to,
        subject,
        html,
        attachments: attachment ? [attachment] : [],
      });

      await this.prisma.notification.create({
        data: {
          tenantId,
          type: 'email',
          event,
          recipient: to,
          message: subject,
          status: 'sent',
          referenceId,
        },
      });

      this.logger.log(`Email sent to ${to} — ${event}`);
    } catch (error) {
      await this.prisma.notification.create({
        data: {
          tenantId,
          type: 'email',
          event,
          recipient: to,
          message: subject,
          status: 'failed',
          referenceId,
        },
      });

      this.logger.error(`Email failed to ${to}`, error);
    }
  }
}