import { Module } from '@nestjs/common';
import { ShopsService } from './shops.service';
import { ShopsController } from './shops.controller';
import { ShopController } from './shop.controller';
import { ActivityLogsModule } from '../activity-logs/activity-logs.module';

@Module({
  imports: [ActivityLogsModule],
  controllers: [ShopsController, ShopController],
  providers: [ShopsService],
  exports: [ShopsService],
})
export class ShopsModule {}
