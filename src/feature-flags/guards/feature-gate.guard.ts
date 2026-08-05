import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { FEATURE_KEY_METADATA } from '../decorators/require-feature.decorator';
import { FeatureFlagsService } from '../feature-flags.service';

@Injectable()
export class FeatureGateGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly featureFlagsService: FeatureFlagsService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const featureKey = this.reflector.getAllAndOverride<string>(FEATURE_KEY_METADATA, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!featureKey) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user || !user.tenant_id) {
      throw new UnauthorizedException('UNAUTHORIZED');
    }

    const isEnabled = await this.featureFlagsService.isFeatureEnabled(user.tenant_id, featureKey);
    if (!isEnabled) {
      throw new ForbiddenException('FEATURE_DISABLED');
    }

    return true;
  }
}
