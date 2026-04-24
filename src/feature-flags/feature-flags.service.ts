import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import Redis from 'ioredis';
import {
  FeatureFlags,
  PLAN_FEATURES,
  PlanName,
  isPlanName,
} from '../config/plan-features.config';
import { REDIS_CLIENT } from '../redis/redis.module';

interface CachedFeatureFlagsPayload {
  plan: PlanName;
  flags: FeatureFlags;
}

@Injectable()
export class FeatureFlagsService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(REDIS_CLIENT) private readonly redis: Redis,
  ) {}

  private cacheKey(tenantId: string): string {
    return `pos_features:${tenantId}`;
  }

  private asInputJson(flags: FeatureFlags): Prisma.InputJsonValue {
    return flags as unknown as Prisma.InputJsonValue;
  }

  private normalizeFlags(rawFlags: unknown, plan: PlanName): FeatureFlags {
    const defaults = PLAN_FEATURES[plan];

    if (!rawFlags || typeof rawFlags !== 'object' || Array.isArray(rawFlags)) {
      return { ...defaults };
    }

    const value = rawFlags as Record<string, unknown>;

    return {
      pos_sales:
        typeof value.pos_sales === 'boolean'
          ? value.pos_sales
          : defaults.pos_sales,
      basic_inventory:
        typeof value.basic_inventory === 'boolean'
          ? value.basic_inventory
          : defaults.basic_inventory,
      single_branch:
        typeof value.single_branch === 'boolean'
          ? value.single_branch
          : defaults.single_branch,
      basic_reports:
        typeof value.basic_reports === 'boolean'
          ? value.basic_reports
          : defaults.basic_reports,
      multi_branch:
        typeof value.multi_branch === 'boolean'
          ? value.multi_branch
          : defaults.multi_branch,
      tax_officer_mode:
        typeof value.tax_officer_mode === 'boolean'
          ? value.tax_officer_mode
          : defaults.tax_officer_mode,
      advanced_reports:
        typeof value.advanced_reports === 'boolean'
          ? value.advanced_reports
          : defaults.advanced_reports,
      staff_management:
        typeof value.staff_management === 'boolean'
          ? value.staff_management
          : defaults.staff_management,
      api_access:
        typeof value.api_access === 'boolean'
          ? value.api_access
          : defaults.api_access,
    };
  }

  private async getOrCreateSettings(tenantId: string) {
    return this.prisma.db.shopSettings.upsert({
      where: { tenant_id: tenantId },
      update: {},
      create: {
        tenant_id: tenantId,
        plan: 'starter',
        feature_flags: this.asInputJson(PLAN_FEATURES.starter),
      },
      select: {
        tenant_id: true,
        plan: true,
        feature_flags: true,
      },
    });
  }

  async getFlags(tenantId: string): Promise<FeatureFlags> {
    const cacheKey = this.cacheKey(tenantId);

    const cached = await this.redis.get(cacheKey);
    if (cached) {
      const cachedPayload = JSON.parse(cached) as CachedFeatureFlagsPayload;
      const cachedPlan: PlanName = isPlanName(cachedPayload?.plan)
        ? cachedPayload.plan
        : 'starter';

      return this.normalizeFlags(cachedPayload?.flags, cachedPlan);
    }

    const settings = await this.getOrCreateSettings(tenantId);
    const plan: PlanName = isPlanName(settings.plan) ? settings.plan : 'starter';
    const flags = this.normalizeFlags(settings.feature_flags, plan);

    // No TTL by design. Explicit invalidation is used on updates.
    const payload: CachedFeatureFlagsPayload = { plan, flags };
    await this.redis.set(cacheKey, JSON.stringify(payload));
    return flags;
  }

  async toggleFlag(
    tenantId: string,
    flag: keyof FeatureFlags,
    enabled: boolean,
  ): Promise<FeatureFlags> {
    const settings = await this.getOrCreateSettings(tenantId);
    const currentPlan: PlanName = isPlanName(settings.plan)
      ? settings.plan
      : 'starter';

    // Flag can only be managed when the current plan entitles this feature.
    if (!PLAN_FEATURES[currentPlan][flag]) {
      throw new ForbiddenException({
        error: 'FEATURE_NOT_IN_PLAN',
        feature: flag,
        current_plan: currentPlan,
      });
    }

    const existingFlags = this.normalizeFlags(settings.feature_flags, currentPlan);
    const updatedFlags: FeatureFlags = {
      ...existingFlags,
      [flag]: enabled,
    };

    await this.prisma.db.shopSettings.update({
      where: { tenant_id: tenantId },
      data: {
        feature_flags: this.asInputJson(updatedFlags),
      },
    });

    await this.redis.del(this.cacheKey(tenantId));
    return updatedFlags;
  }

  async provisionPlanFeatures(
    tenantId: string,
    newPlan: PlanName,
  ): Promise<FeatureFlags> {
    if (!isPlanName(newPlan)) {
      throw new BadRequestException({
        error: 'INVALID_PLAN',
        plan: newPlan,
      });
    }

    const nextFlags = PLAN_FEATURES[newPlan];

    await this.prisma.db.shopSettings.upsert({
      where: { tenant_id: tenantId },
      update: {
        plan: newPlan,
        feature_flags: this.asInputJson(nextFlags),
      },
      create: {
        tenant_id: tenantId,
        plan: newPlan,
        feature_flags: this.asInputJson(nextFlags),
      },
    });

    await this.redis.del(this.cacheKey(tenantId));
    return { ...nextFlags };
  }
}
