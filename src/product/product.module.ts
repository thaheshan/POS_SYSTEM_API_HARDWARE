import { Module } from '@nestjs/common';
import Redis from 'ioredis';
import { CacheClient } from './product.service';
import { ProductService } from './product.service';
import { ProductController } from './product.controller';

@Module({
  controllers: [ProductController],
  providers: [
    ProductService,
    {
      provide: 'REDIS_CLIENT',
      useFactory: (): CacheClient => {
        const redisUrl = process.env.REDIS_URL;
        if (!redisUrl && !process.env.REDIS_HOST) {
          const store = new Map<string, { value: string; expiresAt: number }>();
          return {
            async get(key: string) {
              const entry = store.get(key);
              if (!entry) {
                return null;
              }
              if (entry.expiresAt < Date.now()) {
                store.delete(key);
                return null;
              }
              return entry.value;
            },
            async set(
              key: string,
              value: string,
              _mode: 'EX',
              ttlSeconds: number,
            ) {
              store.set(key, {
                value,
                expiresAt: Date.now() + ttlSeconds * 1000,
              });
              return 'OK';
            },
            async del(...keys: string[]) {
              let count = 0;
              for (const key of keys) {
                if (store.delete(key)) {
                  count += 1;
                }
              }
              return count;
            },
          };
        }
        const client = redisUrl
          ? new Redis(redisUrl, { lazyConnect: true, maxRetriesPerRequest: 1 })
          : new Redis({
              host: process.env.REDIS_HOST ?? '127.0.0.1',
              port: Number(process.env.REDIS_PORT ?? 6379),
              password: process.env.REDIS_PASSWORD,
              lazyConnect: true,
              maxRetriesPerRequest: 1,
            });
        client.on('error', () => {
          // suppress unhandled error events to avoid crashing the app
        });
        return client;
      },
    },
  ],
})
export class ProductModule {}
