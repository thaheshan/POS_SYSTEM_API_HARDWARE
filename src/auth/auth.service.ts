import {
  Injectable,
  NotFoundException,
  UnauthorizedException,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import * as crypto from 'crypto';
import * as bcrypt from 'bcrypt';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(private readonly prisma: PrismaService) {}

  
  async requestPasswordReset(email: string): Promise<{ message: string }> {
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user) {
      throw new NotFoundException('Email not registered');
    }

    const code = crypto.randomInt(100000, 999999).toString();
    const expiry = new Date(Date.now() + 15 * 60 * 1000);

    try {
      await this.prisma.user.update({
        where: { email },
        data: {
          passwordResetToken: code,
          passwordResetExpiry: expiry,
          passwordResetUsed: false,
        },
      });
    } catch (error) {
      this.logger.error('Failed to store reset code', error);
      throw new InternalServerErrorException('Failed to generate code');
    }

    
    this.logger.log(`✅ Password reset code for ${email}: ${code}`);

    return { message: 'Verification email sent successfully' };
  }

 
  async resetPassword(
    email: string,
    verification_code: string,
    new_password: string,
  ): Promise<{ message: string }> {
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user) {
      throw new NotFoundException('Email not registered');
    }

    
    if (!user.passwordResetToken || !user.passwordResetExpiry) {
      throw new UnauthorizedException('No password reset request found');
    }

    
    if (user.passwordResetUsed) {
      throw new UnauthorizedException('Verification code already used');
    }

    
    if (user.passwordResetToken !== verification_code) {
      throw new UnauthorizedException('Invalid verification code');
    }

    
    if (user.passwordResetExpiry < new Date()) {
      throw new UnauthorizedException('Verification code has expired');
    }

    const hashedPassword = await bcrypt.hash(new_password, 10);

    try {
      await this.prisma.user.update({
        where: { email },
        data: {
          password: hashedPassword,
          passwordResetToken: null,
          passwordResetExpiry: null,
          passwordResetUsed: true,
        },
      });
    } catch (error) {
      this.logger.error('Failed to update password', error);
      throw new InternalServerErrorException('Failed to update password');
    }

    return { message: 'Password updated successfully' };
  }
}