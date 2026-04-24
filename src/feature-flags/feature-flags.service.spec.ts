import { ForbiddenException } from '@nestjs/common';
import { FeatureFlagsService } from './feature-flags.service';

describe('FeatureFlagsService', () => {
  const tenantId = 'tenant-1';

  const redis = {
    get: jest.fn(),
    set: jest.fn(),
    del: jest.fn(),
  };

  const prisma = {
    db: {
      shopSettings: {
        upsert: jest.fn(),
        update: jest.fn(),
      },
    },
  };

  let service: FeatureFlagsService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new FeatureFlagsService(prisma as never, redis as never);
  });

  it('loads flags from DB on cache miss and stores cache payload', async () => {
    redis.get.mockResolvedValue(null);
    prisma.db.shopSettings.upsert.mockResolvedValue({
      tenant_id: tenantId,
      plan: 'business',
      feature_flags: {
        pos_sales: true,
        basic_inventory: true,
        single_branch: true,
        basic_reports: true,
        multi_branch: true,
        tax_officer_mode: false,
        advanced_reports: true,
        staff_management: true,
        api_access: false,
      },
    });

    const result = await service.getFlags(tenantId);

    expect(result.multi_branch).toBe(true);
    expect(result.staff_management).toBe(true);
    expect(redis.set).toHaveBeenCalledWith(
      `pos_features:${tenantId}`,
      expect.stringContaining('"plan":"business"'),
    );
  });

  it('reads plan-aware cache payload correctly', async () => {
    redis.get.mockResolvedValue(
      JSON.stringify({
        plan: 'enterprise',
        flags: {
          pos_sales: true,
          basic_inventory: true,
          single_branch: true,
          basic_reports: true,
          multi_branch: true,
          tax_officer_mode: true,
          advanced_reports: true,
          staff_management: true,
          api_access: true,
        },
      }),
    );

    const result = await service.getFlags(tenantId);

    expect(result.api_access).toBe(true);
    expect(prisma.db.shopSettings.upsert).not.toHaveBeenCalled();
  });

  it('blocks toggling a feature not in current plan', async () => {
    prisma.db.shopSettings.upsert.mockResolvedValue({
      tenant_id: tenantId,
      plan: 'starter',
      feature_flags: {},
    });

    await expect(
      service.toggleFlag(tenantId, 'multi_branch', true),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('merge-patches enabled flag and invalidates cache', async () => {
    prisma.db.shopSettings.upsert.mockResolvedValue({
      tenant_id: tenantId,
      plan: 'business',
      feature_flags: {
        pos_sales: true,
        basic_inventory: true,
        single_branch: true,
        basic_reports: true,
        multi_branch: true,
        tax_officer_mode: false,
        advanced_reports: true,
        staff_management: true,
        api_access: false,
      },
    });

    await service.toggleFlag(tenantId, 'staff_management', false);

    expect(prisma.db.shopSettings.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { tenant_id: tenantId },
        data: expect.objectContaining({
          feature_flags: expect.any(Object),
        }),
      }),
    );
    expect(redis.del).toHaveBeenCalledWith(`pos_features:${tenantId}`);
  });

  it('provisions plan features with full replace and cache invalidation', async () => {
    prisma.db.shopSettings.upsert.mockResolvedValue({});

    const result = await service.provisionPlanFeatures(tenantId, 'business');

    expect(result.multi_branch).toBe(true);
    expect(result.tax_officer_mode).toBe(false);
    expect(prisma.db.shopSettings.upsert).toHaveBeenCalled();
    expect(redis.del).toHaveBeenCalledWith(`pos_features:${tenantId}`);
  });
});
