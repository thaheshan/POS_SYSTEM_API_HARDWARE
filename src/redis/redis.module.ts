import { Global, Module } from '@nestjs/common';
import Redis from 'ioredis';

export const REDIS_CLIENT = 'REDIS_CLIENT';

@Global()
@Module({
  providers: [
    {
      provide: REDIS_CLIENT,
      useFactory: () => {
        const redisUrl = process.env.REDIS_URL ?? 'redis://127.0.0.1:6379';
        const redis = new Redis(redisUrl);

        redis.on('error', (err: unknown) => {
          const message = err instanceof Error ? err.message : String(err);
          // Keep process alive while making connectivity issues visible.
          // Feature-gated routes will fail with controlled responses.
          console.error('Redis connection error:', message);
        });

        return redis;
      },
    },
  ],
  exports: [REDIS_CLIENT],
})
export class RedisModule {}
