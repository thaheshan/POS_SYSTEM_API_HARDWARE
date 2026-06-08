import { Injectable, InternalServerErrorException, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createCipheriv, createDecipheriv, randomBytes } from 'crypto';

const ENCRYPTION_PREFIX = 'enc:v1';
const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12;

@Injectable()
export class TotpSecretCryptoService {
  private readonly key: Buffer;

  constructor(private readonly configService: ConfigService) {
    const keyBase64 = this.configService.get<string>('TOTP_ENCRYPTION_KEY');
    if (!keyBase64) {
      throw new InternalServerErrorException(
        'TOTP_ENCRYPTION_KEY is not configured',
      );
    }

    const key = Buffer.from(keyBase64, 'base64');
    if (key.length !== 32) {
      throw new InternalServerErrorException(
        'TOTP_ENCRYPTION_KEY must decode to 32 bytes (base64)',
      );
    }

    this.key = key;
  }

  isEncrypted(value: string): boolean {
    return value.startsWith(`${ENCRYPTION_PREFIX}:`);
  }

  encrypt(plaintext: string): string {
    const iv = randomBytes(IV_LENGTH);
    const cipher = createCipheriv(ALGORITHM, this.key, iv);

    const encrypted = Buffer.concat([
      cipher.update(plaintext, 'utf8'),
      cipher.final(),
    ]);
    const authTag = cipher.getAuthTag();

    return [
      ENCRYPTION_PREFIX,
      iv.toString('base64'),
      authTag.toString('base64'),
      encrypted.toString('base64'),
    ].join(':');
  }

  decrypt(payload: string): string {
    const parts = payload.split(':');
    if (parts.length !== 5 || `${parts[0]}:${parts[1]}` !== ENCRYPTION_PREFIX) {
      throw new UnauthorizedException('Invalid encrypted TOTP secret format');
    }

    try {
      const iv = Buffer.from(parts[2], 'base64');
      const authTag = Buffer.from(parts[3], 'base64');
      const ciphertext = Buffer.from(parts[4], 'base64');

      const decipher = createDecipheriv(ALGORITHM, this.key, iv);
      decipher.setAuthTag(authTag);

      const decrypted = Buffer.concat([
        decipher.update(ciphertext),
        decipher.final(),
      ]);

      return decrypted.toString('utf8');
    } catch {
      throw new UnauthorizedException('Unable to decrypt TOTP secret');
    }
  }
}
