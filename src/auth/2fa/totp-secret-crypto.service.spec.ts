import { ConfigService } from '@nestjs/config';
import { UnauthorizedException } from '@nestjs/common';
import { TotpSecretCryptoService } from './totp-secret-crypto.service';

describe('TotpSecretCryptoService', () => {
  const key = Buffer.from('12345678901234567890123456789012').toString('base64');

  function createService() {
    const config = {
      get: jest.fn().mockImplementation((name: string) => {
        if (name === 'TOTP_ENCRYPTION_KEY') {
          return key;
        }
        return undefined;
      }),
    } as unknown as ConfigService;

    return new TotpSecretCryptoService(config);
  }

  it('encrypts and decrypts a TOTP secret', () => {
    const service = createService();
    const plain = 'JBSWY3DPEHPK3PXP';

    const encrypted = service.encrypt(plain);

    expect(service.isEncrypted(encrypted)).toBe(true);
    expect(service.decrypt(encrypted)).toBe(plain);
  });

  it('throws on tampered encrypted secret', () => {
    const service = createService();
    const encrypted = service.encrypt('JBSWY3DPEHPK3PXP');
    const parts = encrypted.split(':');
    parts[3] = Buffer.alloc(16, 0).toString('base64');
    const tampered = parts.join(':');

    expect(() => service.decrypt(tampered)).toThrow(UnauthorizedException);
  });
});
