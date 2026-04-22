import { Module } from '@nestjs/common';
import { HealthController } from './controllers/health/health.controller';
import { HealthService } from './services/health/health.service';
import Redis from 'ioredis';
import { ConfigService } from '@nestjs/config';

const TemporaryRedisProvider = {
  provide: 'TEMP_REDIS_CLIENT',
  useFactory: (configService: ConfigService) => {
    // Falls back to standard local Redis port if REDIS_URL isn't in your .env
    const redisUrl = configService.get<string>(
      'REDIS_URL',
      'redis://localhost:6379',
    );
    return new Redis(redisUrl);
  },
  inject: [ConfigService],
};

@Module({
  controllers: [HealthController],
  providers: [HealthService, TemporaryRedisProvider],
})
export class HealthModule {}
