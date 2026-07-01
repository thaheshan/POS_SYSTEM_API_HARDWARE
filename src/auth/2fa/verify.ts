// POST /2fa/verify
import {
  Injectable,
  BadRequestException,
  UnauthorizedException,
} from '@nestjs/common';
import * as speakeasy from 'speakeasy';
import { UserService } from '../../user/user.service';
import { TotpSecretCryptoService } from './totp-secret-crypto.service';

@Injectable()
export class VerifyTOTPService {
  constructor(
    private readonly userService: UserService,
    private readonly totpSecretCryptoService: TotpSecretCryptoService,
  ) {}

  async verify(userId: string, token: string): Promise<void> {
    const user = await this.userService.findById(userId);
    if (!user || !user.twoFactorSecret) {
      throw new BadRequestException('TOTP not set up');
    }

    const storedSecret = user.twoFactorSecret;
    const secretToVerify = this.totpSecretCryptoService.isEncrypted(
      storedSecret,
    )
      ? this.totpSecretCryptoService.decrypt(storedSecret)
      : storedSecret;

    const verified = speakeasy.totp.verify({
      secret: secretToVerify,
      encoding: 'base32',
      token,
      window: 1,
    });

    if (!verified) {
      throw new UnauthorizedException('Invalid TOTP token');
    }

    // Migrate legacy plaintext secrets to encrypted storage after first successful verification.
    if (!this.totpSecretCryptoService.isEncrypted(storedSecret)) {
      const encryptedSecret =
        this.totpSecretCryptoService.encrypt(storedSecret);
      await this.userService.updateUser(userId, {
        totp_secret: encryptedSecret,
      });
    }

    // Enable 2FA for the user in the DB
    await this.userService.updateUser(userId, { two_factor_enabled: true });
  }
}
