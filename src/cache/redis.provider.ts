import Redis from 'ioredis';
import { CacheClient } from './cache-client.interface';
import { REDIS_CLIENT } from './cache.constants';
import { RedisCircuitBreaker } from './circuit-breaker';

/**
 * Resilient Redis Client with Circuit Breaker
 * Provides graceful fallback to in-memory cache when Redis is unavailable
 */
class ResilientRedisClient implements CacheClient {
  private redisClient: Redis;
  private inMemoryStore = new Map<
    string,
    { value: string; expiresAt: number }
  >();
  private circuitBreaker: RedisCircuitBreaker;
  private isConnected = false;

  constructor(redisClient: Redis) {
    this.redisClient = redisClient;
    this.circuitBreaker = new RedisCircuitBreaker({
      failureThreshold: 5,
      successThreshold: 2,
      timeout: 60,
    });

    // Monitor connection
    this.redisClient.on('connect', () => {
      this.isConnected = true;
      this.circuitBreaker.recordSuccess();
      console.info('[Redis] Connected successfully');
    });

    this.redisClient.on('error', (error) => {
      this.isConnected = false;
      this.circuitBreaker.recordFailure();
      console.error('[Redis] Connection error:', error.message);
    });

    this.redisClient.on('reconnecting', () => {
      console.info('[Redis] Attempting to reconnect...');
    });

    // Start health monitoring
    this.circuitBreaker.startMonitoring();
  }

  /**
   * Get value from Redis or fallback to in-memory store
   */
  async get(key: string): Promise<string | null> {
    // If circuit is open, use in-memory fallback only
    if (!this.circuitBreaker.canExecute()) {
      return this.getFromMemory(key);
    }

    try {
      const value = await this.redisClient.get(key);
      this.circuitBreaker.recordSuccess();
      return value;
    } catch (error) {
      this.circuitBreaker.recordFailure();
      console.warn(
        `[Redis] GET failed for key ${key}, using in-memory fallback`,
      );
      return this.getFromMemory(key);
    }
  }

  /**
   * Set value in Redis and in-memory store
   */
  async set(
    key: string,
    value: string,
    mode: 'EX',
    ttlSeconds: number,
  ): Promise<'OK' | null> {
    // Always store in memory for fallback
    this.setInMemory(key, value, ttlSeconds);

    // If circuit is open, skip Redis write
    if (!this.circuitBreaker.canExecute()) {
      console.debug(`[Redis] Circuit open, skipped SET for key ${key}`);
      return 'OK';
    }

    try {
      await this.redisClient.set(key, value, mode, ttlSeconds);
      this.circuitBreaker.recordSuccess();
      return 'OK';
    } catch (error) {
      this.circuitBreaker.recordFailure();
      console.warn(`[Redis] SET failed for key ${key}, used in-memory only`);
      return 'OK'; // Still succeed since we have in-memory backup
    }
  }

  /**
   * Delete key from Redis and in-memory store
   */
  async del(...keys: string[]): Promise<number> {
    // Always delete from memory
    let memoryDeleted = 0;
    for (const key of keys) {
      if (this.inMemoryStore.delete(key)) {
        memoryDeleted++;
      }
    }

    // If circuit is open, return memory count
    if (!this.circuitBreaker.canExecute()) {
      return memoryDeleted;
    }

    try {
      const redisDeleted = await this.redisClient.del(...keys);
      this.circuitBreaker.recordSuccess();
      return redisDeleted;
    } catch (error) {
      this.circuitBreaker.recordFailure();
      console.warn(
        `[Redis] DEL failed, using in-memory count: ${memoryDeleted}`,
      );
      return memoryDeleted;
    }
  }

  /**
   * Get value from in-memory store
   */
  private getFromMemory(key: string): string | null {
    const entry = this.inMemoryStore.get(key);
    if (!entry) {
      return null;
    }
    if (entry.expiresAt < Date.now()) {
      this.inMemoryStore.delete(key);
      return null;
    }
    return entry.value;
  }

  /**
   * Set value in in-memory store
   */
  private setInMemory(key: string, value: string, ttlSeconds: number): void {
    this.inMemoryStore.set(key, {
      value,
      expiresAt: Date.now() + ttlSeconds * 1000,
    });
  }

  /**
   * Get circuit breaker health for monitoring
   */
  getHealthStatus(): object {
    return {
      redisConnected: this.isConnected,
      circuitBreaker: this.circuitBreaker.getHealth(),
      inMemoryStorageSize: this.inMemoryStore.size,
    };
  }
}

export const redisClientProvider = {
  provide: REDIS_CLIENT,
  useFactory: (): CacheClient => {
    const redisUrl = process.env.REDIS_URL;

    // If no Redis config, use pure in-memory cache
    if (!redisUrl && !process.env.REDIS_HOST) {
      console.warn(
        '[Redis] No Redis configuration found. Using in-memory cache only.',
      );
      const store = new Map<string, { value: string; expiresAt: number }>();
      return {
        get(key: string) {
          const entry = store.get(key);
          if (!entry) {
            return Promise.resolve(null);
          }
          if (entry.expiresAt < Date.now()) {
            store.delete(key);
            return Promise.resolve(null);
          }
          return Promise.resolve(entry.value);
        },
        set(key: string, value: string, _mode: 'EX', ttlSeconds: number) {
          store.set(key, {
            value,
            expiresAt: Date.now() + ttlSeconds * 1000,
          });
          return Promise.resolve('OK');
        },
        del(...keys: string[]) {
          let count = 0;
          for (const key of keys) {
            if (store.delete(key)) {
              count += 1;
            }
          }
          return Promise.resolve(count);
        },
      };
    }

    // Create Redis client with connection settings
    const client = redisUrl
      ? new Redis(redisUrl, {
          lazyConnect: true,
          maxRetriesPerRequest: 1,
          enableReadyCheck: true,
          enableOfflineQueue: false,
          retryStrategy: (times) => {
            const delay = Math.min(times * 50, 2000);
            return delay;
          },
        })
      : new Redis({
          host: process.env.REDIS_HOST ?? '127.0.0.1',
          port: Number(process.env.REDIS_PORT ?? 6379),
          password: process.env.REDIS_PASSWORD,
          lazyConnect: true,
          maxRetriesPerRequest: 1,
          enableReadyCheck: true,
          enableOfflineQueue: false,
          retryStrategy: (times) => {
            const delay = Math.min(times * 50, 2000);
            return delay;
          },
        });

    console.info(
      '[Redis] Initializing resilient Redis client with circuit breaker',
    );
    return new ResilientRedisClient(client);
  },
};
