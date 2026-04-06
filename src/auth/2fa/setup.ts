// POST /2fa/setup
import { Injectable, BadRequestException } from '@nestjs/common';
import * as speakeasy from 'speakeasy';
import * as qrcode from 'qrcode';
import { UserService } from '../../user/user.service';

@Injectable()
export class SetupTOTPService {
  constructor(private readonly userService: UserService) {}

  async setup(userId: string): Promise<{ secret: string; qr_code_url: string }> {
    const user = await this.userService.findById(userId);
    if (!user) {
      throw new BadRequestException('User not found');
    }

    const secret = speakeasy.generateSecret({
      name: `POS System (${user.email})`,
      issuer: 'POS System',
    });

    // Store the base32 secret in the database
    await this.userService.updateUser(userId, { totp_secret: secret.base32 });

    const otpauthUrl = speakeasy.otpauthURL({
      secret: secret.base32,
      label: `POS System (${user.email})`,
      issuer: 'POS System',
      encoding: 'base32',
    });

    const qrCodeUrl = await qrcode.toDataURL(otpauthUrl);

    return {
      secret: secret.base32,
      qr_code_url: qrCodeUrl,
    };
  }
}