import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { Prisma } from '@prisma/client';
import { AnalyticsService } from '../analytics.service';
import { PrismaService } from '../../prisma/prisma.service';
import { WeeklyAnalyticsReport } from '../interfaces/analytics-report.interface';
import { ReportExportService } from '../report-export.service';
import * as nodemailer from 'nodemailer';

@Injectable()
export class WeeklyReportCronService {
  private readonly logger = new Logger(WeeklyReportCronService.name);
  private readonly BATCH_SIZE = 5;
  private readonly weeklyReportLockKey = 910241;

  constructor(
    private readonly analyticsService: AnalyticsService,
    private readonly prisma: PrismaService,
    private readonly exportService: ReportExportService,
  ) {}

  @Cron('0 6 * * 1')
  async handleWeeklyReportGeneration(): Promise<void> {
    await this.prisma.$transaction(
      async (tx) => {
        const rows = await tx.$queryRaw<Array<{ locked: boolean }>>(
          Prisma.sql`
            SELECT pg_try_advisory_xact_lock(${this.weeklyReportLockKey}) AS locked
          `,
        );

        if (!rows[0]?.locked) {
          this.logger.warn(
            'CRON SKIPPED: Previous weekly report generation still in progress',
          );
          return;
        }

        this.logger.log('CRON INITIATED: Automated Weekly Report Generation');

        const startTime = Date.now();
        const today = new Date();
        const utcToday = new Date(
          Date.UTC(
            today.getUTCFullYear(),
            today.getUTCMonth(),
            today.getUTCDate(),
          ),
        );
        const lastMonday = new Date(utcToday);
        lastMonday.setUTCDate(utcToday.getUTCDate() - 7);

        const pad = (n: number) => n.toString().padStart(2, '0');
        const weekStartString = `${lastMonday.getUTCFullYear()}-${pad(
          lastMonday.getUTCMonth() + 1,
        )}-${pad(lastMonday.getUTCDate())}`;

        const shops = await tx.shop.findMany({
          select: { id: true, name: true, email: true },
        });

        this.logger.log(
          `Found ${shops.length} shops. Beginning batch generation process...`,
        );

        let processedCount = 0;
        let successCount = 0;
        let failureCount = 0;

        for (let i = 0; i < shops.length; i += this.BATCH_SIZE) {
          const batch = shops.slice(i, i + this.BATCH_SIZE);
          this.logger.debug(
            `Processing batch ${Math.floor(i / this.BATCH_SIZE) + 1}/${Math.ceil(
              shops.length / this.BATCH_SIZE,
            )} (shops ${i + 1}-${Math.min(i + this.BATCH_SIZE, shops.length)})`,
          );

          const results = await Promise.allSettled(
            batch.map((shop) =>
              this.processShopReport(
                shop.id,
                shop.name,
                shop.email,
                weekStartString,
              ),
            ),
          );

          for (const result of results) {
            processedCount++;
            if (result.status === 'fulfilled') {
              successCount++;
            } else {
              failureCount++;
              this.logger.error(
                `Batch item failed: ${
                  result.reason instanceof Error
                    ? result.reason.message
                    : String(result.reason)
                }`,
              );
            }
          }

          this.logger.debug(
            `Batch complete. Progress: ${processedCount}/${shops.length} (${successCount} successful, ${failureCount} failed)`,
          );
        }

        const elapsedMs = Date.now() - startTime;
        const percentUsed = (elapsedMs / (4 * 60 * 60 * 1000)) * 100;
        this.logger.log(
          `CRON PERFORMANCE: Used ${percentUsed.toFixed(1)}% of timeout (${Math.floor(elapsedMs / 1000)}s actual)`,
        );

        this.logger.log(
          `CRON COMPLETED: Generated ${successCount} reports, ${failureCount} failures out of ${shops.length} shops`,
        );
      },
      {
        maxWait: 10000, // Wait up to 10 seconds to acquire the lock
        timeout: 4 * 60 * 60 * 1000,
      },
    );
  }

  private async processShopReport(
    shopId: string,
    shopName: string,
    shopEmail: string | null,
    weekStartString: string,
  ): Promise<void> {
    try {
      this.logger.debug(`Processing report for: ${shopName} (${shopId})`);

      const report = await this.analyticsService.generateWeeklyReport(shopId, {
        week_start: weekStartString,
      });

      this.logger.debug(`Report generated successfully for: ${shopName}`);

      if (shopEmail) {
        await this.sendEmailSummary(shopEmail, shopName, report);
      }
    } catch (shopError) {
      this.logger.error(
        `Failed to generate report for shop: ${shopName} (${shopId})`,
        shopError instanceof Error ? shopError.stack : String(shopError),
      );
      throw shopError;
    }
  }

  private async sendEmailSummary(
    email: string,
    shopName: string,
    report: WeeklyAnalyticsReport,
  ): Promise<void> {
    const totalRevenue = report.dailyRevenue.reduce(
      (sum, day) => sum + day.revenue,
      0,
    );

    this.logger.debug(
      `Sending weekly summary email to ${email} for ${shopName}. Total Revenue: Rs. ${totalRevenue.toFixed(2)}`,
    );

    try {
      const transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: Number(process.env.SMTP_PORT),
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASSWORD,
        },
      });

      const pdfBuffer = await this.exportService.generatePdfBuffer(
        `Weekly Performance Report: ${report.weekStart}`,
        report,
      );

      const chartRowsHtml = report.dailyRevenue
        .map(
          (day) => `
        <tr>
          <td style="padding: 8px; border: 1px solid #ddd; font-size: 13px;">${day.date}</td>
          <td style="padding: 8px; border: 1px solid #ddd; font-size: 13px; text-align: right;">Rs. ${day.revenue.toLocaleString()}</td>
        </tr>`,
        )
        .join('');

      const htmlBody = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #333; line-height: 1.5;">
          <h2 style="color: #1e40af; border-bottom: 2px solid #1e40af; padding-bottom: 10px; margin-bottom: 20px;">Weekly Performance Report</h2>
          <p>Dear Shop Owner,</p>
          <p>Please find below the weekly performance summary for <strong>${shopName}</strong> (Week starting ${report.weekStart}).</p>
          
          <div style="background-color: #f3f4f6; border-radius: 8px; padding: 15px; margin: 20px 0;">
            <p style="margin: 0; font-size: 15px; font-weight: bold; color: #111827;">
              Total Weekly Revenue: <span style="color: #059669;">Rs. ${totalRevenue.toLocaleString()}</span>
            </p>
          </div>
          
          <h3 style="color: #1e40af; margin-top: 25px; margin-bottom: 10px;">Daily Revenue Trend</h3>
          <table style="width: 100%; border-collapse: collapse; margin-top: 10px; margin-bottom: 20px;">
            <thead>
              <tr style="background-color: #f3f4f6; text-align: left;">
                <th style="padding: 10px; border: 1px solid #ddd; font-size: 13px;">Date</th>
                <th style="padding: 10px; border: 1px solid #ddd; font-size: 13px; text-align: right;">Revenue</th>
              </tr>
            </thead>
            <tbody>
              ${chartRowsHtml}
            </tbody>
          </table>
          
          <p>A detailed PDF breakdown showing tax compliance and category performance is attached to this email.</p>
          
          <hr style="border: 0; border-top: 1px solid #e5e7eb; margin: 30px 0;" />
          <p style="font-size: 11px; color: #9ca3af; text-align: center; margin: 0;">
            This is an automated notification from your POS system. Please do not reply directly to this email.
          </p>
        </div>
      `;

      await transporter.sendMail({
        from: process.env.EMAIL_FROM,
        to: email,
        subject: `Weekly Performance Report - ${shopName} (${report.weekStart})`,
        html: htmlBody,
        attachments: [
          {
            filename: `weekly_report_${report.weekStart}.pdf`,
            content: pdfBuffer,
          },
        ],
      });

      this.logger.log(
        `Weekly report email sent successfully to ${email} for shop ${shopName}`,
      );
    } catch (err) {
      this.logger.error(
        `Failed to send weekly report email to ${email}`,
        err instanceof Error ? err.stack : String(err),
      );
    }
  }
}
