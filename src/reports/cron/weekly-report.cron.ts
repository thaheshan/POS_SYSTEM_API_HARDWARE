import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { AnalyticsService } from '../analytics.service';
import { PrismaService } from '../../prisma/prisma.service';
import { WeeklyAnalyticsReport } from '../interfaces/analytics-report.interface';

@Injectable()
export class WeeklyReportCronService {
  private readonly logger = new Logger(WeeklyReportCronService.name);

  constructor(
    private readonly analyticsService: AnalyticsService,
    private readonly prisma: PrismaService,
  ) {}

  @Cron('0 6 * * 1')
  async handleWeeklyReportGeneration() {
    this.logger.log('CRON INITIATED: Automated Weekly Report Generation');

    const today = new Date();
    const lastMonday = new Date(today);
    lastMonday.setDate(today.getDate() - 7);

    const weekStartString = lastMonday.toISOString().split('T')[0];

    try {
      const shops = await this.prisma.shop.findMany({
        select: { id: true, name: true, email: true },
      });

      this.logger.log(
        `Found ${shops.length} shops. Beginning generation process...`,
      );

      for (const shop of shops) {
        try {
          this.logger.debug(`Processing report for: ${shop.name} (${shop.id})`);

          const report = await this.analyticsService.generateWeeklyReport(
            shop.id,
            { week_start: weekStartString },
            undefined,
          );

          if (shop.email) {
            this.sendEmailSummary(shop.email, shop.name, report);
          }
        } catch (shopError) {
          this.logger.error(
            `Failed to generate report for shop: ${shop.name}`,
            shopError,
          );
        }
      }

      this.logger.log('CRON COMPLETED: Automated Weekly Report Generation');
    } catch (error) {
      this.logger.error(
        'CRON FAILED: Critical error during report generation',
        error,
      );
    }
  }

  private sendEmailSummary(
    email: string,
    shopName: string,
    report: WeeklyAnalyticsReport,
  ) {
    // TODO: Connect this to your MailerService when the Email Module is built
    this.logger.debug(
      `[MOCK EMAIL] Sending weekly summary to ${email} for ${shopName}. ` +
        `Total Revenue: $${report.dailyRevenue.reduce((sum, day) => sum + day.revenue, 0).toFixed(2)}`,
    );
  }
}
