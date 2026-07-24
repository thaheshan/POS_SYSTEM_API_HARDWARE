import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { SystemModule } from './system/system.module';
import { AuthModule } from './auth/auth.module';
import { RedisModule } from './redis/redis.module';
import { FeatureFlagsModule } from './feature-flags/feature-flags.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    PrismaModule,
    SystemModule,
    AuthModule,
    RedisModule,
    FeatureFlagsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
