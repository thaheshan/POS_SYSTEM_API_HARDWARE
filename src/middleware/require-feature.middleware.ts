import { NextFunction, Request, Response } from 'express';
import Redis from 'ioredis';
import { PrismaService } from '../prisma/prisma.service';
import {
  FeatureFlags,
  PLAN_FEATURES,
  PlanName,
} from '../config/plan-features.config';

interface RequestWithTenant extends Request {
  user?: {
    tenant_id?: string;
  };
  featureFlags?: FeatureFlags;
}

interface CachedFeatureFlagsPayload {
  plan: PlanName;
  flags: FeatureFlags;
}

function normalizeFlags(rawFlags: unknown, plan: PlanName): FeatureFlags {
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

export function requireFeature(
  flagName: keyof FeatureFlags,
  prisma: PrismaService,
  redis: Redis,
) {
  return async (req: Request, res: Response, next: NextFunction) => {
    const request = req as RequestWithTenant;
    const tenantId = request.user?.tenant_id;

    if (!tenantId) {
      return res.status(401).json({ error: 'UNAUTHORIZED' });
    }

    const cacheKey = `pos_features:${tenantId}`;

    try {
      // 1) Try Redis cache first.
      const cachedFlags = await redis.get(cacheKey);
      let flags: FeatureFlags;

      if (cachedFlags) {
        const cachedPayload = JSON.parse(cachedFlags) as CachedFeatureFlagsPayload;
        const cachedPlan: PlanName =
          cachedPayload?.plan === 'business' || cachedPayload?.plan === 'enterprise'
            ? cachedPayload.plan
            : 'starter';

        flags = normalizeFlags(cachedPayload?.flags, cachedPlan);
      } else {
        // 2) Cache miss -> fetch from ShopSettings.
        const settings = await prisma.db.shopSettings.findUnique({
          where: { tenant_id: tenantId },
          select: {
            feature_flags: true,
            plan: true,
          },
        });

        const plan =
          settings?.plan === 'business' || settings?.plan === 'enterprise'
            ? settings.plan
            : 'starter';

        flags = normalizeFlags(settings?.feature_flags, plan as PlanName);

        // 3) Cache resolved flags without TTL.
        const payload: CachedFeatureFlagsPayload = {
          plan: plan as PlanName,
          flags,
        };
        await redis.set(cacheKey, JSON.stringify(payload));
      }

      request.featureFlags = flags;

      // 4) Enforce gate.
      if (!flags[flagName]) {
        return res.status(403).json({
          error: 'FEATURE_NOT_ENABLED',
          feature: flagName,
          upgrade_required: true,
        });
      }

      return next();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unexpected error';
      return res.status(500).json({ error: 'FEATURE_CHECK_FAILED', message });
    }
  };
}
