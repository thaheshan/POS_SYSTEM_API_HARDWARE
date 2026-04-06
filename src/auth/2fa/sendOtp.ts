// POST /2fa/send-otp
import { Injectable, BadRequestException, InternalServerErrorException } from '@nestjs/common';
import { randomInt } from 'crypto';
import { UserService } from '../../user/user.service';
import Redis from 'ioredis';
import axios from 'axios';

@Injectable()
export class SendSmsOtpService {
  private redis: Redis;

  constructor(private readonly userService: UserService) {
    const redisUrl = process.env.REDIS_URL ?? 'redis://127.0.0.1:6379';
    this.redis = new Redis(redisUrl);
    this.redis.on('error', (err) => {
      console.error('Redis connection error (sendOtp):', err instanceof Error ? err.message : err);
    });
  }

  async sendOtp(userId: string): Promise<void> {
    const user = await this.userService.findById(userId);
    if (!user || !user.phone_number) {
      throw new BadRequestException('Phone number not set');
    }

    const apiKey = process.env.TEXT_LK_API_KEY;
    const senderId = process.env.TEXT_LK_SENDER_ID;

    if (!apiKey || !senderId) {
      throw new BadRequestException('SMS gateway not configured');
    }

    const otp = randomInt(100000, 1000000).toString();

    // Store in Redis with key `otp:{user_id}`, TTL = 300 seconds
    try {
      await this.redis.set(`otp:${userId}`, otp, 'EX', 300);
    } catch (err) {
      throw new InternalServerErrorException('Redis unavailable for OTP storage');
    }

    // Send OTP via Text.lk SMS gateway
    const apiUrl = 'https://app.text.lk/api/v3/sms/send';

    await axios.post(
      apiUrl,
      {
        recipient: user.phone_number,
        sender_id: senderId,
        message: `Your OTP is: ${otp}`,
      },
      {
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
      },
    );
  }
}