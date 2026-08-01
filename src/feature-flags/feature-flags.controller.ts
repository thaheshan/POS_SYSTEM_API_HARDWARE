import {
  Controller,
  Patch,
  Param,
  Body,
  UseGuards,
  Req,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { FeatureFlagsService } from './feature-flags.service';
import { ToggleFeatureDto } from './dto/toggle-feature.dto';

type FeatureFlagsRequest = {
  user: {
    user_id: string;
    tenant_id: string;
  };
};

@Controller('settings/features')
export class FeatureFlagsController {
  constructor(private readonly featureFlagsService: FeatureFlagsService) {}

  @UseGuards(JwtAuthGuard)
  @Patch(':flag')
  async toggleFeature(
    @Param('flag') flag: string,
    @Body() dto: ToggleFeatureDto,
    @Req() req: FeatureFlagsRequest,
  ) {
    return this.featureFlagsService.toggleFeature(
      req.user.user_id,
      req.user.tenant_id,
      flag,
      dto.enabled,
    );
  }
}
