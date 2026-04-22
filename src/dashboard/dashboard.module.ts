import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { RedisModule } from '../cache/redis.module';
import { AuthModule } from '../auth/auth.module';
import { DashboardController } from './dashboard.controller';
import { DashboardService } from './services/dashboard.service';
import { OwnerDashboardService } from './services/owner-dashboard.service';
import { ManagerDashboardService } from './services/manager-dashboard.service';
import { CashierDashboardService } from './services/cashier-dashboard.service';
import { RoleAccessGuard } from './guards/role-access.guard';

@Module({
  imports: [PrismaModule, RedisModule, AuthModule],
  controllers: [DashboardController],
  providers: [
    DashboardService,
    OwnerDashboardService,
    ManagerDashboardService,
    CashierDashboardService,
    RoleAccessGuard,
  ],
  exports: [DashboardService],
})
export class DashboardModule {}
