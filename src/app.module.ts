import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { SystemModule } from './system/system.module';
import { ProductModule } from './product/product.module';
import { StockModule } from './stock/stock.module';
import { AuthModule } from './auth/auth.module';
import { RedisModule } from './cache/redis.module';
import { InventoryModule } from './inventory/inventory.module';
import { SalesModule } from './sales/sales.module';
import { ReportsModule } from './reports/reports.module';
import { DashboardModule } from './dashboard/dashboard.module';
import { ScheduleModule } from '@nestjs/schedule';
import { StaffModule } from './staff/staff.module';
import { AdminModule } from './admin/admin.module';
import { TokenLoggerMiddleware } from './common/middleware/token-logger.middleware';
import { CustomersModule } from './customers/customers.module';
import { SalesModule } from './sales/sales.module';
import { DashboardModule } from './dashboard/dashboard.module';
import { NotificationsModule } from './notifications/notifications.module';
import { SuppliersModule } from './suppliers/suppliers.module';
import { RolesModule } from './roles/roles.module';
import { ExpensesModule } from './expenses/expenses.module';
import { ShopsModule } from './shops/shops.module';
import { ContactModule } from './contact/contact.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    ThrottlerModule.forRoot([
      {
        ttl: 60000, // 60 seconds in milliseconds
        limit: 1000, // 1000 requests per minute as baseline
      },
    ]),
    PrismaModule,
    SystemModule,
    ProductModule,
    StockModule,
    RedisModule,
    AuthModule,
    InventoryModule,
    SalesModule,
    ReportsModule,
    DashboardModule,
    ScheduleModule.forRoot(),
    StaffModule,
    AdminModule,
    CustomersModule,
    SalesModule,
    DashboardModule,
    NotificationsModule,
    SuppliersModule,
    RolesModule,
    ExpensesModule,
    ShopsModule,
    ContactModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(TokenLoggerMiddleware).forRoutes('*');
  }
}
