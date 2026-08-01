import { Reflector } from '@nestjs/core';
import { UnauthorizedException, ForbiddenException, ExecutionContext } from '@nestjs/common';
import { FeatureGateGuard } from './feature-gate.guard';
import { FeatureFlagsService } from '../feature-flags.service';

describe('FeatureGateGuard', () => {
  let guard: FeatureGateGuard;
  let reflector: Reflector;
  let featureFlagsService: Partial<FeatureFlagsService>;

  beforeEach(() => {
    reflector = new Reflector();
    featureFlagsService = {
      isFeatureEnabled: jest.fn(),
    };
    guard = new FeatureGateGuard(reflector, featureFlagsService as FeatureFlagsService);
  });

  const createMockContext = (user?: any): ExecutionContext => {
    const request = { user };
    return {
      getHandler: jest.fn(),
      getClass: jest.fn(),
      switchToHttp: () => ({
        getRequest: () => request,
      }),
    } as unknown as ExecutionContext;
  };

  it('should allow access if no featureKey metadata is defined', async () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(undefined);
    const context = createMockContext({ tenant_id: 'tenant-123' });

    const result = await guard.canActivate(context);
    expect(result).toBe(true);
  });

  it('should throw UnauthorizedException if req.user is missing', async () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue('DISCOUNTS');
    const context = createMockContext(undefined);

    await expect(guard.canActivate(context)).rejects.toThrow(UnauthorizedException);
  });

  it('should throw UnauthorizedException if tenant_id is missing on user', async () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue('DISCOUNTS');
    const context = createMockContext({ user_id: 'user-1' });

    await expect(guard.canActivate(context)).rejects.toThrow(UnauthorizedException);
  });

  it('should throw ForbiddenException if feature is disabled', async () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue('DISCOUNTS');
    (featureFlagsService.isFeatureEnabled as jest.Mock).mockResolvedValue(false);
    const context = createMockContext({ user_id: 'user-1', tenant_id: 'tenant-123' });

    await expect(guard.canActivate(context)).rejects.toThrow(ForbiddenException);
    expect(featureFlagsService.isFeatureEnabled).toHaveBeenCalledWith('tenant-123', 'DISCOUNTS');
  });

  it('should allow access if feature is enabled', async () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue('DISCOUNTS');
    (featureFlagsService.isFeatureEnabled as jest.Mock).mockResolvedValue(true);
    const context = createMockContext({ user_id: 'user-1', tenant_id: 'tenant-123' });

    const result = await guard.canActivate(context);
    expect(result).toBe(true);
  });
});
