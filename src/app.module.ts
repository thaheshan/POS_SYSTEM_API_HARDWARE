import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { SystemModule } from './system/system.module';
import { AuthModule } from './auth/auth.module';
import { TaxModule } from './tax/tax.module';
import { ScheduleModule } from '@nestjs/schedule';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    PrismaModule,
    SystemModule,
    AuthModule,
    ScheduleModule.forRoot(),
    TaxModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
