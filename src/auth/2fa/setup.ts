// POST /2fa/setup
import { Injectable, BadRequestException } from '@nestjs/common';
import * as speakeasy from 'speakeasy';
import * as qrcode from 'qrcode';
import { UserService } from '../../user/user.service';
import { TotpSecretCryptoService } from './totp-secret-crypto.service';

@Injectable()
export class SetupTOTPService {
  constructor(
    private readonly userService: UserService,
    private readonly totpSecretCryptoService: TotpSecretCryptoService,
  ) {}

  async setup(userId: string): Promise<{ secret: string; qr_code_url: string }> {
    const user = await this.userService.findById(userId);
    if (!user) {
      throw new BadRequestException('User not found');
    }

    const secret = speakeasy.generateSecret({
      name: `POS System (${user.email})`,
      issuer: 'POS System',
    });

    // Store encrypted secret at rest to prevent seed exposure from raw DB leaks.
    const encryptedSecret = this.totpSecretCryptoService.encrypt(secret.base32);
    await this.userService.updateUser(userId, { totp_secret: encryptedSecret });

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