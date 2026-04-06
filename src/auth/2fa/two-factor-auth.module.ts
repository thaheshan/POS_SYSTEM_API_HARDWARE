import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TwoFactorAuthController } from './two-factor-auth.controller';
import { TwoFactorAuthService } from './two-factor-auth.service';
import { SetupTOTPService } from './setup';
import { VerifyTOTPService } from './verify';
import { SendSmsOtpService } from './sendOtp';
import { VerifySmsOtpService } from './verifyOtp';
import { UserModule } from '../../user/user.module';

@Module({
  imports: [
    UserModule,
    ConfigModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        secret: configService.getOrThrow<string>('JWT_SECRET'),
        signOptions: {
          expiresIn: '5m' as const,
        },
      }),
      inject: [ConfigService],
    }),
  ],
  controllers: [TwoFactorAuthController],
  providers: [
    TwoFactorAuthService,
    SetupTOTPService,
    VerifyTOTPService,
    SendSmsOtpService,
    VerifySmsOtpService,
  ],
  exports: [TwoFactorAuthService],
})
export class TwoFactorAuthModule {}