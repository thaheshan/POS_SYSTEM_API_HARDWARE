import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UserService } from '../../user/user.service';
import { SetupTOTPService } from './setup';
import { VerifyTOTPService } from './verify';
import { SendSmsOtpService } from './sendOtp';
import { VerifySmsOtpService } from './verifyOtp';

@Injectable()
export class TwoFactorAuthService {
  constructor(
    private readonly setupService: SetupTOTPService,
    private readonly verifyService: VerifyTOTPService,
    private readonly sendOtpService: SendSmsOtpService,
    private readonly verifyOtpService: VerifySmsOtpService,
    private readonly jwtService: JwtService,
    private readonly userService: UserService,
  ) {}

  async setupTOTP(userId: string) {
    return this.setupService.setup(userId);
  }

  async verifyTOTP(userId: string, token: string) {
    return this.verifyService.verify(userId, token);
  }

  async sendSmsOtp(userId: string) {
    return this.sendOtpService.sendOtp(userId);
  }

  async verifySmsOtp(userId: string, otp: string) {
    return this.verifyOtpService.verifyOtp(userId, otp);
  }

  async issueLoginTokens(userId: string) {
    const user = await this.userService.findById(userId);
    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    const payload = {
      sub: user.user_id,
      email: user.email,
      role: user.role,
      tenant_id: user.tenant_id,
    };

    const access_token = await this.jwtService.signAsync(payload);
    const refresh_token = await this.jwtService.signAsync(payload, {
      expiresIn: '7d',
    });

    return {
      access_token,
      refresh_token,
      token_type: 'Bearer',
      user: {
        user_id: user.user_id,
        email: user.email,
        first_name: user.first_name,
        last_name: user.last_name,
        role: user.role,
        tenant_id: user.tenant_id,
      },
    };
  }
}