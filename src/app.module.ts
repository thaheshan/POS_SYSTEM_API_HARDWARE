import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { SystemModule } from './system/system.module';
import { AuthModule } from './auth/auth.module';
import { ReportsModule } from './reports/reports.module';
import { InventoryModule } from './inventory/inventory.module';
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
import { ActivityLogsModule } from './activity-logs/activity-logs.module';
import { SmsModule } from './sms/sms.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    PrismaModule,
    SystemModule,
    AuthModule,
    ReportsModule,
    InventoryModule,
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
    ActivityLogsModule,
    SmsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(TokenLoggerMiddleware).forRoutes('*');
  }
}
