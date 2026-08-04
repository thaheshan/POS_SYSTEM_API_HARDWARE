import { Inject, Injectable, Logger, ForbiddenException } from '@nestjs/common';
import Redis from 'ioredis';
import { PrismaService } from '../prisma/prisma.service';
import { REDIS_CLIENT } from '../redis/redis.module';

@Injectable()
export class FeatureFlagsService {
  private readonly logger = new Logger(FeatureFlagsService.name);

  constructor(
    @Inject(REDIS_CLIENT) private readonly redis: Redis,
    public readonly prisma: PrismaService,
  ) {}

  private getCacheKey(tenantId: string, featureKey: string): string {
    return `feature:${tenantId}:${featureKey}`;
  }

  async isFeatureEnabled(tenantId: string, featureKey: string): Promise<boolean> {
    const cacheKey = this.getCacheKey(tenantId, featureKey);

    try {
      const cachedValue = await this.redis.get(cacheKey);

      if (cachedValue !== null) {
        return cachedValue === 'true';
      }
    } catch (redisErr: unknown) {
      const message = redisErr instanceof Error ? redisErr.message : String(redisErr);
      this.logger.warn(`Redis GET failed for key ${cacheKey}, falling back to DB: ${message}`);
    }

    try {
      // Database fallback when cache is unavailable or misses.
      const featureFlag = await this.prisma.featureFlag.findUnique({
        where: {
          tenant_id_feature_key: {
            tenant_id: tenantId,
            feature_key: featureKey,
          },
        },
      });

      const isEnabled = featureFlag?.enabled ?? false;

      try {
        await this.redis.set(cacheKey, isEnabled ? 'true' : 'false', 'EX', 300);
      } catch (redisSetErr: unknown) {
        const message = redisSetErr instanceof Error ? redisSetErr.message : String(redisSetErr);
        this.logger.warn(`Redis SET failed for key ${cacheKey}: ${message}`);
      }

      return isEnabled;
    } catch (dbErr: unknown) {
      const message = dbErr instanceof Error ? dbErr.message : String(dbErr);
      this.logger.error(
        `Feature flag lookup failed for key ${cacheKey}, defaulting to disabled: ${message}`,
      );
      return false;
    }
  }

  async toggleFeature(
    userId: string,
    tenantId: string,
    featureKey: string,
    enabled: boolean,
  ) {
    // 3. Privilege Escalation Fix: Query DB live for current user role
    const dbUser = await this.prisma.user.findUnique({
      where: { user_id: userId },
      select: { role: true, is_active: true },
    });

    const roleName = dbUser?.role?.name?.toLowerCase();
    if (!dbUser || !dbUser.is_active || (roleName !== 'owner' && roleName !== 'manager')) {
      throw new ForbiddenException('Only owner or manager can toggle features');
    }

    const updated = await this.prisma.featureFlag.upsert({
      where: {
        tenant_id_feature_key: {
          tenant_id: tenantId,
          feature_key: featureKey,
        },
      },
      update: { enabled },
      create: {
        tenant_id: tenantId,
        feature_key: featureKey,
        enabled,
      },
    });

    const cacheKey = this.getCacheKey(tenantId, featureKey);
    try {
      await this.redis.set(cacheKey, enabled ? 'true' : 'false', 'EX', 300);
    } catch (redisSetErr: unknown) {
      const message = redisSetErr instanceof Error ? redisSetErr.message : String(redisSetErr);
      this.logger.warn(`Redis SET failed on toggle for key ${cacheKey}: ${message}`);
    }

    return updated;
  }
}
