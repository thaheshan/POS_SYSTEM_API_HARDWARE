import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { Prisma } from '@prisma/client';
import { AnalyticsService } from '../analytics.service';
import { PrismaService } from '../../prisma/prisma.service';
import { WeeklyAnalyticsReport } from '../interfaces/analytics-report.interface';

@Injectable()
export class WeeklyReportCronService {
  private readonly logger = new Logger(WeeklyReportCronService.name);
  private readonly BATCH_SIZE = 5;
  private readonly weeklyReportLockKey = 910241;

  constructor(
    private readonly analyticsService: AnalyticsService,
    private readonly prisma: PrismaService,
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
        this.sendEmailSummary(shopEmail, shopName, report);
      }
    } catch (shopError) {
      this.logger.error(
        `Failed to generate report for shop: ${shopName} (${shopId})`,
        shopError instanceof Error ? shopError.stack : String(shopError),
      );
      throw shopError;
    }
  }

  private sendEmailSummary(
    email: string,
    shopName: string,
    report: WeeklyAnalyticsReport,
  ): void {
    // TODO: Integrate with actual email service provider (e.g., SendGrid, SES)
    const totalRevenue = report.dailyRevenue.reduce(
      (sum, day) => sum + day.revenue,
      0,
    );

    this.logger.debug(
      `[MOCK EMAIL] Sending weekly summary to ${email} for ${shopName}. Total Revenue: $${totalRevenue.toFixed(
        2,
      )}`,
    );
  }
}
