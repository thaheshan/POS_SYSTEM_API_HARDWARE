import {
  BadRequestException,
  Body,
  Controller,
  ForbiddenException,
  Patch,
  Req,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { FeatureFlagsService } from './feature-flags.service';
import {
  isFeatureFlagKey,
  FeatureFlags,
} from '../config/plan-features.config';
import { AuthUser } from '../auth/interfaces/auth-user.interface';
import { Request } from 'express';

interface RequestWithUser extends Request {
  user?: AuthUser;
}

@Controller('settings/features')
export class FeatureFlagsController {
  constructor(private readonly featureFlagsService: FeatureFlagsService) {}

  @Patch(':flag')
  @UseGuards(JwtAuthGuard)
  async toggleFlag(
    @Req() req: RequestWithUser,
    @Body('enabled') enabled: unknown,
  ) {
    const user = req.user;

    if (!user) {
      throw new UnauthorizedException('Authentication required');
    }

    if (user.role !== 'owner' && user.role !== 'manager') {
      throw new ForbiddenException('Only owner or manager can toggle features');
    }

    const rawFlagParam = req.params.flag;
    const rawFlag = Array.isArray(rawFlagParam) ? rawFlagParam[0] : rawFlagParam;
    if (!isFeatureFlagKey(rawFlag)) {
      throw new BadRequestException({
        error: 'INVALID_FEATURE_FLAG',
        flag: rawFlag,
      });
    }

    if (typeof enabled !== 'boolean') {
      throw new BadRequestException({
        error: 'INVALID_PAYLOAD',
        message: 'enabled must be a boolean',
      });
    }

    const flags = await this.featureFlagsService.toggleFlag(
      user.tenant_id,
      rawFlag,
      enabled,
    );

    return {
      feature: rawFlag,
      enabled: flags[rawFlag as keyof FeatureFlags],
      flags,
    };
  }
}
