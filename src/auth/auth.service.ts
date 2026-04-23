import {
  Injectable,
  NotFoundException,
  UnauthorizedException,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import * as crypto from 'crypto';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { LoginDto } from '../system/dto/login.dto';
import { UserService } from '../user/user.service';
import { InactiveUserException } from './exceptions/inactive-user.exception';
import { UnverifiedUserException } from './exceptions/unverified-user.exception';
import { LockedAccountException } from './exceptions/locked-account.exception';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);
  
  constructor(
    private readonly prisma: PrismaService,
    private readonly userService: UserService,
    private readonly jwtService: JwtService,
  ) {}
  
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
           password_reset_token: code,       
           password_reset_expiry: expiry,  
           password_reset_used: false,
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

    
    if (!user.password_reset_token || !user.password_reset_expiry) {
      throw new UnauthorizedException('No password reset request found');
    }

    
    if (user.password_reset_used) {
      throw new UnauthorizedException('Verification code already used');
    }

    
    if (user.password_reset_token !== verification_code) {
      throw new UnauthorizedException('Invalid verification code');
    }

    
    if (user.password_reset_expiry < new Date()) {
      throw new UnauthorizedException('Verification code has expired');
    }

    const hashedPassword = await bcrypt.hash(new_password, 10);

    try {
      await this.prisma.user.update({
        where: { email },
        data: {
          password_hash: hashedPassword, 
          password_reset_token: null, 
          password_reset_expiry: null, 
          password_reset_used: true,
        },
      });
    } catch (error) {
      this.logger.error('Failed to update password', error);
      throw new InternalServerErrorException('Failed to update password');
    }

    return { message: 'Password updated successfully' };
  }

  async login(loginDto: LoginDto) {
    const { email, password } = loginDto;

    try {
      const user = await this.userService.findByEmailWithCredentials(email);

      if (!user) {
        throw new UnauthorizedException('Invalid email or password');
      }

      const isPasswordValid = await bcrypt.compare(password, user.password_hash);

      if (!isPasswordValid) {
        await this.userService.incrementFailedLoginAttempts(email);
        throw new UnauthorizedException('Invalid email or password');
      }

      if (user.account_locked_until && new Date() < user.account_locked_until) {
        const unlockTime = user.account_locked_until.toLocaleTimeString();
        throw new LockedAccountException(unlockTime);
      }

      if (!user.is_active) {
        throw new InactiveUserException();
      }

      if (!user.is_verified) {
        throw new UnverifiedUserException();
      }

      await this.userService.resetLoginState(email);

      const payload = {
        sub: user.user_id,
        email: user.email,
        role: user.role,
        tenant_id: user.tenant_id,
      };

      const access_token = await this.jwtService.signAsync(payload);

      return {
        statusCode: 200,
        message: 'Login successful',
        data: {
          access_token,
          token_type: 'Bearer',
          user: {
            user_id: user.user_id,
            email: user.email,
            first_name: user.first_name,
            last_name: user.last_name,
            role: user.role,
            tenant_id: user.tenant_id,
          },
        },
      };
    } catch (error) {
      if (
        error instanceof UnauthorizedException ||
        error instanceof InactiveUserException ||
        error instanceof UnverifiedUserException ||
        error instanceof LockedAccountException
      ) {
        throw error;
      }

      this.logger.error('Login failed', error);
      throw new InternalServerErrorException('Failed to process login');
    }
  }
}
