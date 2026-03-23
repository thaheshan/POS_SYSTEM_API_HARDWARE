import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { SystemModule } from './system/system.module';
import { CategoriesModule } from './categories/categories.module';
import { BrandsModule } from './brands/brands.module';
import { UnitsModule } from './units/units.module';
import redisConfig from './config/redis.config';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [redisConfig],
    }),
    PrismaModule,
    SystemModule,
    CategoriesModule,
    BrandsModule,
    UnitsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
