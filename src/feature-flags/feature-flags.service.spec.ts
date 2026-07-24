import { ForbiddenException } from '@nestjs/common';
import { FeatureFlagsService } from './feature-flags.service';
import { PrismaService } from '../prisma/prisma.service';

describe('FeatureFlagsService', () => {
  let service: FeatureFlagsService;
  let redisMock: any;
  let prismaMock: any;

  beforeEach(() => {
    redisMock = {
      get: jest.fn(),
      set: jest.fn(),
    };

    prismaMock = {
      featureFlag: {
        findUnique: jest.fn(),
        upsert: jest.fn(),
      },
      user: {
        findUnique: jest.fn(),
      },
    };

    service = new FeatureFlagsService(redisMock, prismaMock as unknown as PrismaService);
  });

  describe('isFeatureEnabled', () => {
    it('should return cached value if Redis returns cached string', async () => {
      redisMock.get.mockResolvedValue('true');

      const result = await service.isFeatureEnabled('tenant-1', 'DISCOUNTS');
      expect(result).toBe(true);
      expect(redisMock.get).toHaveBeenCalledWith('feature:tenant-1:DISCOUNTS');
      expect(prismaMock.featureFlag.findUnique).not.toHaveBeenCalled();
    });

    it('should fallback to DB gracefully if Redis throws an error', async () => {
      redisMock.get.mockRejectedValue(new Error('Redis connection error'));
      prismaMock.featureFlag.findUnique.mockResolvedValue({ enabled: true });
      redisMock.set.mockResolvedValue('OK');

      const result = await service.isFeatureEnabled('tenant-1', 'DISCOUNTS');
      expect(result).toBe(true);
      expect(prismaMock.featureFlag.findUnique).toHaveBeenCalledWith({
        where: {
          tenant_id_feature_key: {
            tenant_id: 'tenant-1',
            feature_key: 'DISCOUNTS',
          },
        },
      });
    });

    it('should handle Redis set error gracefully after DB lookup', async () => {
      redisMock.get.mockResolvedValue(null);
      prismaMock.featureFlag.findUnique.mockResolvedValue({ enabled: false });
      redisMock.set.mockRejectedValue(new Error('Redis offline'));

      const result = await service.isFeatureEnabled('tenant-1', 'DISCOUNTS');
      expect(result).toBe(false);
    });
  });

  describe('toggleFeature', () => {
    it('should query live DB user role and throw ForbiddenException if user is demoted to cashier', async () => {
      prismaMock.user.findUnique.mockResolvedValue({
        user_id: 'user-1',
        role: 'cashier',
        is_active: true,
      });

      await expect(
        service.toggleFeature('user-1', 'tenant-1', 'DISCOUNTS', true),
      ).rejects.toThrow(ForbiddenException);

      expect(prismaMock.user.findUnique).toHaveBeenCalledWith({
        where: { user_id: 'user-1' },
        select: { role: true, is_active: true },
      });
      expect(prismaMock.featureFlag.upsert).not.toHaveBeenCalled();
    });

    it('should allow toggle if DB user role is owner or manager', async () => {
      prismaMock.user.findUnique.mockResolvedValue({
        user_id: 'user-1',
        role: 'owner',
        is_active: true,
      });
      prismaMock.featureFlag.upsert.mockResolvedValue({
        tenant_id: 'tenant-1',
        feature_key: 'DISCOUNTS',
        enabled: true,
      });
      redisMock.set.mockResolvedValue('OK');

      const result = await service.toggleFeature('user-1', 'tenant-1', 'DISCOUNTS', true);
      expect(result).toBeDefined();
      expect(prismaMock.featureFlag.upsert).toHaveBeenCalled();
    });
  });
});
