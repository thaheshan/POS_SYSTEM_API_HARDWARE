import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { SystemModule } from './system/system.module';
import { AuthModule } from './auth/auth.module';
import { StockService } from './inventory/stock/stock.service';
import { StockController } from './inventory/stock/stock.controller';
import { InventoryModule } from './inventory/inventory.module';
import { ScheduleModule } from '@nestjs/schedule';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    PrismaModule,
    SystemModule,
    AuthModule,
    InventoryModule,
    ScheduleModule.forRoot(),
  ],
  controllers: [AppController, StockController],
  providers: [AppService, StockService],
})
export class AppModule {}
