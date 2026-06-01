import { Module } from '@nestjs/common';
import { AdminController } from './admin.controller';
import { ShopOwnerController } from './admin.controller';
import { AdminService } from './admin.service';
import { SubscriptionCronService } from './subscription-cron.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [AdminController, ShopOwnerController],
  providers: [AdminService, SubscriptionCronService],
  exports: [AdminService],
})
export class AdminModule {}
