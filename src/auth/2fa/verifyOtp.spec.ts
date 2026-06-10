import { InternalServerErrorException, UnauthorizedException } from '@nestjs/common';
import { VerifySmsOtpService } from './verifyOtp';

describe('VerifySmsOtpService', () => {
  const redis = {
    get: jest.fn(),
    incr: jest.fn(),
    expire: jest.fn(),
    del: jest.fn(),
  };

  let service: VerifySmsOtpService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new VerifySmsOtpService(redis as never);
  });

  it('increments failed attempts before checking the limit', async () => {
    redis.get.mockImplementation(async (key: string) => {
      if (key.startsWith('otp:')) {
        return '123456';
      }
      return null;
    });
    redis.incr.mockResolvedValue(1);

    await expect(service.verifyOtp('user-1', '000000')).rejects.toBeInstanceOf(
      UnauthorizedException,
    );

    expect(redis.incr).toHaveBeenCalledWith('otp_attempts:user-1');
    expect(redis.expire).toHaveBeenCalledWith('otp_attempts:user-1', 300);
    expect(redis.del).not.toHaveBeenCalled();
  });

  it('blocks after more than 3 failed attempts and clears redis keys', async () => {
    redis.get.mockImplementation(async (key: string) => {
      if (key.startsWith('otp:')) {
        return '123456';
      }
      return null;
    });
    redis.incr.mockResolvedValue(4);

    await expect(service.verifyOtp('user-1', '000000')).rejects.toBeInstanceOf(
      UnauthorizedException,
    );

    expect(redis.del).toHaveBeenCalledWith('otp:user-1');
    expect(redis.del).toHaveBeenCalledWith('otp_attempts:user-1');
  });

  it('throws when redis is unavailable for attempt update', async () => {
    redis.get.mockImplementation(async (key: string) => {
      if (key.startsWith('otp:')) {
        return '123456';
      }
      return null;
    });
    redis.incr.mockRejectedValue(new Error('redis down'));

    await expect(service.verifyOtp('user-1', '000000')).rejects.toBeInstanceOf(
      InternalServerErrorException,
    );
  });
});
