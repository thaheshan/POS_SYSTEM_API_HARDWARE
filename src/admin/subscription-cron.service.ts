import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import * as nodemailer from 'nodemailer';

@Injectable()
export class SubscriptionCronService {
  private readonly logger = new Logger(SubscriptionCronService.name);

  constructor(private readonly prisma: PrismaService) {}

  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async handleSubscriptionReminders() {
    this.logger.log('Running daily subscription check...');
    
    const shops = await this.prisma.shop.findMany({
      where: {
        subscriptionStatus: 'ACTIVE',
        nextPaymentDue: { not: null }
      },
      include: {
        users: {
          where: { role: { name: 'OWNER' } }
        }
      }
    });

    const now = new Date();
    
    for (const shop of shops) {
      if (!shop.nextPaymentDue) continue;
      
      const due = new Date(shop.nextPaymentDue);
      const diffTime = due.getTime() - now.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      
      // Reset selfReportedPaid flag 10-14 days before next payment due
      // so the owner sees the "payment due" alert again for the new month
      if (diffDays <= 14 && diffDays >= 10 && shop.selfReportedPaid) {
        await this.prisma.shop.update({
          where: { id: shop.id },
          data: { selfReportedPaid: false, paymentStatus: 'PENDING' }
        });
        this.logger.log(`Reset selfReportedPaid for shop ${shop.id} (${diffDays} days until due)`);
      }

      // Remind if exactly 7 days, 3 days, 1 day, or overdue by 1 day
      if ([7, 3, 1, -1].includes(diffDays)) {
        await this.sendReminderEmail(shop, diffDays);
        await this.createInAppNotification(shop, diffDays);
      }
      
      // Auto-suspend if overdue by 7 days
      if (diffDays <= -7) {
        this.logger.log(`Auto-suspending shop ${shop.id} due to overdue payment.`);
        await this.prisma.shop.update({
          where: { id: shop.id },
          data: { subscriptionStatus: 'SUSPENDED' }
        });
      }
    }
  }

  private async sendReminderEmail(shop: any, days: number) {
    const owner = shop.users[0];
    if (!owner || !owner.email) return;

    try {
      const transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: Number(process.env.SMTP_PORT),
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASSWORD,
        },
      });

      const dueMsg = days < 0 
        ? `was due ${Math.abs(days)} day(s) ago` 
        : `is due in ${days} day(s)`;
        
      const suspendWarning = days < 0 ? `<p style="color: red; font-weight: bold;">If payment is not received soon, your account will be suspended.</p>` : '';

      await transporter.sendMail({
        from: process.env.EMAIL_FROM,
        to: owner.email,
        subject: `[Action Required] Subscription Payment Reminder - ${shop.name}`,
        html: `
          <h3>Subscription Payment Reminder</h3>
          <p>Dear ${owner.first_name || 'Shop Owner'},</p>
          <p>This is a reminder that your subscription payment for <b>${shop.name}</b> ${dueMsg} on ${shop.nextPaymentDue.toLocaleDateString()}.</p>
          ${suspendWarning}
          <p>Please contact support or coordinate with administration to record your payment.</p>
        `,
      });
      this.logger.log(`Sent reminder email to ${owner.email} for shop ${shop.id} (Days: ${days})`);
    } catch (err) {
      this.logger.error(`Failed to send reminder to ${owner.email}`, err);
    }
  }

  private async createInAppNotification(shop: any, days: number) {
    const owner = shop.users[0];
    if (!owner) return;
    
    const message = days < 0 
      ? `Your subscription payment is OVERDUE by ${Math.abs(days)} days.`
      : `Your subscription payment is due in ${days} days.`;
      
    await this.prisma.notification.create({
      data: {
        userId: owner.user_id,
        tenantId: shop.id,
        title: 'Subscription Payment Reminder',
        message: message,
        type: 'SYSTEM',
      }
    });
  }
}
