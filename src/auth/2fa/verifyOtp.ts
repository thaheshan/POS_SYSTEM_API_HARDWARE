// POST /2fa/verify-otp
import {
  Injectable,
  InternalServerErrorException,
  UnauthorizedException,
  Inject,
} from '@nestjs/common';
import Redis from 'ioredis';
import { REDIS_CLIENT } from '../../redis/redis.module';

@Injectable()
export class VerifySmsOtpService {
  constructor(@Inject(REDIS_CLIENT) private readonly redis: Redis) {}

  async verifyOtp(userId: string, otp: string): Promise<void> {
    // Read OTP from Redis using key `otp:{user_id}`
    let storedOtp: string | null;
    try {
      storedOtp = await this.redis.get(`otp:${userId}`);
    } catch (err) {
      throw new InternalServerErrorException('Redis unavailable for OTP verification');
    }

    if (!storedOtp) {
      throw new UnauthorizedException('OTP expired or not found');
    }

    // Track failed attempts using Redis INCR first so the counter update is atomic.
    const attemptsKey = `otp_attempts:${userId}`;
    if (storedOtp !== otp) {
      let attempts: number;
      try {
        attempts = await this.redis.incr(attemptsKey);
        if (attempts === 1) {
          await this.redis.expire(attemptsKey, 300);
        }
      } catch (err) {
        throw new InternalServerErrorException('Redis unavailable for OTP verification');
      }

      if (attempts > 3) {
        // Invalidate temp_token after the atomic attempt count crosses the limit.
        await this.redis.del(`otp:${userId}`);
        await this.redis.del(attemptsKey);
        throw new UnauthorizedException('Too many failed attempts, please re-login');
      }

      throw new UnauthorizedException('Invalid OTP');
    }

    // On success
    await this.redis.del(`otp:${userId}`);
    await this.redis.del(attemptsKey);
  }
}