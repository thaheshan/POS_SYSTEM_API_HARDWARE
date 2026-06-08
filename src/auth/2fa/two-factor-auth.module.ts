import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TwoFactorAuthController } from './two-factor-auth.controller';
import { TwoFactorAuthService } from './two-factor-auth.service';
import { SetupTOTPService } from './setup';
import { VerifyTOTPService } from './verify';
import { SendSmsOtpService } from './sendOtp';
import { VerifySmsOtpService } from './verifyOtp';
import { TotpSecretCryptoService } from './totp-secret-crypto.service';
import { UserModule } from '../../user/user.module';
import { RedisModule } from '../../redis/redis.module';

@Module({
  imports: [
    UserModule,
    RedisModule,
    ConfigModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        secret: configService.getOrThrow<string>('JWT_2FA_SECRET'),
      }),
      inject: [ConfigService],
    }),
  ],
  controllers: [TwoFactorAuthController],
  providers: [
    TwoFactorAuthService,
    SetupTOTPService,
    VerifyTOTPService,
    TotpSecretCryptoService,
    SendSmsOtpService,
    VerifySmsOtpService,
  ],
  exports: [TwoFactorAuthService],
})
export class TwoFactorAuthModule {}