import { UnauthorizedException } from '@nestjs/common';
import { FeatureFlagsController } from './feature-flags.controller';
import { FeatureFlagsService } from './feature-flags.service';

describe('FeatureFlagsController', () => {
  let controller: FeatureFlagsController;
  let serviceMock: Partial<FeatureFlagsService>;

  beforeEach(() => {
    serviceMock = {
      toggleFeature: jest.fn(),
    };

    controller = new FeatureFlagsController(serviceMock as FeatureFlagsService);
  });

  it('should throw UnauthorizedException if req.user is undefined or incomplete', async () => {
    await expect(
      controller.toggleFeature('DISCOUNTS', { enabled: true }, { user: null }),
    ).rejects.toThrow(UnauthorizedException);
  });

  it('should call service.toggleFeature with user credentials from request context', async () => {
    (serviceMock.toggleFeature as jest.Mock).mockResolvedValue({
      feature_key: 'DISCOUNTS',
      enabled: true,
    });

    const req = {
      user: {
        user_id: 'usr-1',
        tenant_id: 'tnt-1',
        role: 'manager',
      },
    };

    const res = await controller.toggleFeature('DISCOUNTS', { enabled: true }, req);
    expect(res).toEqual({ feature_key: 'DISCOUNTS', enabled: true });
    expect(serviceMock.toggleFeature).toHaveBeenCalledWith('usr-1', 'tnt-1', 'DISCOUNTS', true);
  });
});
