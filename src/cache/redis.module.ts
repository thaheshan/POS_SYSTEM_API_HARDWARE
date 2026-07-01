import { Global, Module } from '@nestjs/common';
import { redisClientProvider } from './redis.provider';
import { REDIS_CLIENT } from './cache.constants';

@Global()
@Module({
  providers: [redisClientProvider],
  exports: [REDIS_CLIENT],
})
export class RedisModule {}
