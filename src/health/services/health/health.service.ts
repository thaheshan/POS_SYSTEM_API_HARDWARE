import { Inject, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Redis } from 'ioredis';
import { SystemHealthResponse } from 'src/health/interfaces/health-response.interface';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class HealthService {
  private readonly logger = new Logger(HealthService.name);

  private isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null;
  }

  private extractBalance(payload: unknown): number {
    if (!this.isRecord(payload)) return 0;

    const directBalance = payload.balance;
    const nestedBalance = this.isRecord(payload.data)
      ? payload.data.balance
      : undefined;
    const rawBalance = nestedBalance ?? directBalance;

    const parsedBalance =
      typeof rawBalance === 'number'
        ? rawBalance
        : typeof rawBalance === 'string'
          ? Number(rawBalance)
          : 0;

    return Number.isFinite(parsedBalance) ? parsedBalance : 0;
  }

  constructor(
    private readonly prisma: PrismaService,
    @Inject('TEMP_REDIS_CLIENT') private readonly redisClient: Redis, // Inject S3 and SMS services
    // private readonly s3Service: S3Service,
    // private readonly smsService: SmsService,
    private readonly configService: ConfigService,
  ) {}

  async checkSystemHealth(): Promise<SystemHealthResponse> {
    this.logger.log('Executing system health checks...');

    const [dbStatus, redisStatus, storageStatus, smsBalance] =
      await Promise.all([
        this.checkDatabase(),
        this.checkRedis(),
        this.checkStorage(),
        this.checkSmsBalance(),
      ]);

    return {
      database: dbStatus,
      redis: redisStatus,
      storage: storageStatus,
      sms_balance: smsBalance,
      app_version: this.configService.get<string>('APP_VERSION') ?? 'unknown',
      uptime: this.formatUptime(process.uptime()),
    };
  }

  private async checkDatabase(): Promise<string> {
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      return 'ok';
    } catch (error) {
      this.logger.error('Database health check failed', (error as Error).stack);
      return 'failed';
    }
  }

  private async checkRedis(): Promise<string> {
    try {
      const response = await this.redisClient.ping();
      this.logger.debug(`Redis ping response: ${response}`);
      return response === 'PONG' ? 'ok' : 'failed';
    } catch (error) {
      this.logger.error('Redis health check failed', (error as Error).stack);
      return 'failed';
    }
  }

  private async checkStorage(): Promise<string> {
    try {
      // Replace with S3 check: e.g., await this.s3Service.headBucket();
      return Promise.resolve('ok');
    } catch (error) {
      this.logger.error('Storage health check failed', (error as Error).stack);
      return 'failed';
    }
  }

  private async checkSmsBalance(): Promise<number> {
    const CACHE_KEY = 'sms_balance_cache';
    const CACHE_TTL_SECONDS = 300; // 5 minutes

    try {
      const cachedBalance = await this.redisClient.get(CACHE_KEY);

      if (cachedBalance !== null) {
        const parsedCachedBalance = Number(cachedBalance);
        return Number.isFinite(parsedCachedBalance) ? parsedCachedBalance : 0;
      }

      const apiKey = this.configService.get<string>('SMS_API_KEY');

      if (!apiKey) {
        this.logger.warn('SMS API key is missing in .env');
        return 0;
      }

      const response = await fetch('https://app.text.lk/api/v3/balance', {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          Accept: 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(
          `Text.lk API failed with HTTP status: ${response.status}`,
        );
      }

      const responseData: unknown = await response.json();

      const actualBalance = this.extractBalance(responseData);

      await this.redisClient.set(
        CACHE_KEY,
        String(actualBalance),
        'EX',
        CACHE_TTL_SECONDS,
      );

      return actualBalance;
    } catch (error) {
      this.logger.error('SMS API health check failed', (error as Error).stack);
      return 0;
    }
  }

  private formatUptime(seconds: number): string {
    const d = Math.floor(seconds / (3600 * 24));
    const h = Math.floor((seconds % (3600 * 24)) / 3600);
    return `${d} days ${h} hours`;
  }
}
