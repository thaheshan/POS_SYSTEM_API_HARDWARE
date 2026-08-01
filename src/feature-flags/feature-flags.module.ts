import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { RedisModule } from '../redis/redis.module';
import { FeatureFlagsService } from './feature-flags.service';
import { FeatureFlagsController } from './feature-flags.controller';
import { FeatureGateGuard } from './guards/feature-gate.guard';

@Module({
  imports: [PrismaModule, RedisModule],
  controllers: [FeatureFlagsController],
  providers: [FeatureFlagsService, FeatureGateGuard],
  exports: [FeatureFlagsService, FeatureGateGuard],
})
export class FeatureFlagsModule {}
