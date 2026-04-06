// POST /2fa/verify
import { Injectable, BadRequestException, UnauthorizedException } from '@nestjs/common';
import * as speakeasy from 'speakeasy';
import { UserService } from '../../user/user.service';

@Injectable()
export class VerifyTOTPService {
  constructor(private readonly userService: UserService) {}

  async verify(userId: string, token: string): Promise<void> {
    const user = await this.userService.findById(userId);
    if (!user || !user.totp_secret) {
      throw new BadRequestException('TOTP not set up');
    }

    const verified = speakeasy.totp.verify({
      secret: user.totp_secret,
      encoding: 'base32',
      token,
      window: 1,
    });

    if (!verified) {
      throw new UnauthorizedException('Invalid TOTP token');
    }

    // Enable 2FA for the user in the DB
    await this.userService.updateUser(userId, { two_factor_enabled: true });
  }
}