// POST /2fa/verify-otp
import { Injectable, InternalServerErrorException, UnauthorizedException } from '@nestjs/common';
import Redis from 'ioredis';

@Injectable()
export class VerifySmsOtpService {
  private redis: Redis;

  constructor() {
    const redisUrl = process.env.REDIS_URL ?? 'redis://127.0.0.1:6379';
    this.redis = new Redis(redisUrl);
    this.redis.on('error', (err) => {
      console.error('Redis connection error (verifyOtp):', err instanceof Error ? err.message : err);
    });
  }

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

    // Track failed attempts
    const attemptsKey = `otp_attempts:${userId}`;
    let attempts: number;
    try {
      attempts = parseInt(await this.redis.get(attemptsKey) || '0');
    } catch (err) {
      throw new InternalServerErrorException('Redis unavailable for OTP verification');
    }

    if (attempts >= 3) {
      // Invalidate temp_token
      await this.redis.del(`otp:${userId}`);
      await this.redis.del(attemptsKey);
      throw new UnauthorizedException('Too many failed attempts, please re-login');
    }

    if (storedOtp !== otp) {
      await this.redis.incr(attemptsKey);
      await this.redis.expire(attemptsKey, 300);
      throw new UnauthorizedException('Invalid OTP');
    }

    // On success
    await this.redis.del(`otp:${userId}`);
    await this.redis.del(attemptsKey);
  }
}