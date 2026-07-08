// POST /2fa/send-otp
import {
  Injectable,
  BadRequestException,
  InternalServerErrorException,
  Inject,
} from '@nestjs/common';
import { randomInt } from 'crypto';
import { UserService } from '../../user/user.service';
import Redis from 'ioredis';
import axios from 'axios';
import { REDIS_CLIENT } from '../../redis/redis.module';

@Injectable()
export class SendSmsOtpService {
  constructor(
    private readonly userService: UserService,
    @Inject(REDIS_CLIENT) private readonly redis: Redis,
  ) {}

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
      
      if (process.env.NODE_ENV !== 'production') {
        console.log(`[DEV ONLY] SMS OTP for ${user.phone_number}: ${otp}`);
      }
    } catch (err) {
      throw new InternalServerErrorException('Redis unavailable for OTP storage');
    }

    // Send OTP via Text.lk SMS gateway
    const apiUrl = 'https://app.text.lk/api/v3/sms/send';

    try {
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
          timeout: 10000,
        },
      );
    } catch (err) {
      // OTP should not remain valid if delivery fails.
      await this.redis.del(`otp:${userId}`);
      throw new InternalServerErrorException('Unable to send OTP at the moment');
    }
  }
}