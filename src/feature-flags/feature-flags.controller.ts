import {
  Controller,
  Patch,
  Param,
  Body,
  UseGuards,
  Req,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { FeatureFlagsService } from './feature-flags.service';
import { ToggleFeatureDto } from './dto/toggle-feature.dto';

@Controller('settings/features')
export class FeatureFlagsController {
  constructor(private readonly featureFlagsService: FeatureFlagsService) {}

  @UseGuards(JwtAuthGuard)
  @Patch(':flag')
  async toggleFeature(
    @Param('flag') flag: string,
    @Body() dto: ToggleFeatureDto,
    @Req() req: any,
  ) {
    const user = req.user;
    if (!user || !user.user_id || !user.tenant_id) {
      throw new UnauthorizedException('UNAUTHORIZED');
    }

    return this.featureFlagsService.toggleFeature(
      user.user_id,
      user.tenant_id,
      flag,
      dto.enabled,
    );
  }
}
