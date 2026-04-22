import { Inject, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Redis } from 'ioredis';
import { SystemHealthResponse } from 'src/health/interfaces/health-response.interface';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class HealthService {
  private readonly logger = new Logger(HealthService.name);
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
        this.logger.debug(
          `SMS balance cache hit for key: ${CACHE_KEY} (value=${cachedBalance})`,
        );
        return parseInt(cachedBalance, 10);
      }

      this.logger.debug(
        `SMS balance cache miss for key: ${CACHE_KEY}, fetching from provider`,
      );

      // If not in cache, call external Text.lk API (Mocked here)
      // const response = await this.smsService.getBalance();
      const actualBalance = 1520;

      // Store in Redis with an Expiration (EX) time
      await this.redisClient.set(
        CACHE_KEY,
        actualBalance,
        'EX',
        CACHE_TTL_SECONDS,
      );

      this.logger.debug(
        `SMS balance cached under key: ${CACHE_KEY} for ${CACHE_TTL_SECONDS}s`,
      );

      return actualBalance;
    } catch (error) {
      this.logger.error('SMS API health check failed', (error as Error).stack);
      this.logger.warn('Returning fallback SMS balance: 0');
      return 0;
    }
  }

  private formatUptime(seconds: number): string {
    const d = Math.floor(seconds / (3600 * 24));
    const h = Math.floor((seconds % (3600 * 24)) / 3600);
    return `${d} days ${h} hours`;
  }
}
