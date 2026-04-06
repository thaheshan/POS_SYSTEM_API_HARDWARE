import {
  Injectable,
  UnauthorizedException,
  InternalServerErrorException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import * as speakeasy from 'speakeasy';
import { LoginDto } from '../system/dto/login.dto';
import { UserService } from '../user/user.service';
import { TwoFactorAuthService } from './2fa/two-factor-auth.service';
import { InactiveUserException } from './exceptions/inactive-user.exception';
import { UnverifiedUserException } from './exceptions/unverified-user.exception';
import { LockedAccountException } from './exceptions/locked-account.exception';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly userService: UserService,
    private readonly jwtService: JwtService,
    private readonly twoFactorAuthService: TwoFactorAuthService,
  ) {}

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

      // Check if 2FA is enabled
      if (user.two_factor_enabled) {
        // Generate temp token for 2FA
        const tempPayload = {
          sub: user.user_id,
          type: '2fa_pending',
        };
        const temp_token = await this.jwtService.signAsync(tempPayload, { expiresIn: '5m' });

        return {
          statusCode: 200,
          message: '2FA required',
          data: {
            requires_2fa: true,
            method: user.totp_secret ? 'totp' : 'sms',
            temp_token,
          },
        };
      }

      const payload = {
        sub: user.user_id,
        email: user.email,
        role: user.role,
        tenant_id: user.tenant_id,
      };

      const access_token = await this.jwtService.signAsync(payload);
      const refresh_token = await this.jwtService.signAsync(payload, { expiresIn: '7d' });

      return {
        statusCode: 200,
        message: 'Login successful',
        data: {
          access_token,
          refresh_token,
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

  async completeLogin(tempToken: string, otp?: string, token?: string) {
    let payload;
    try {
      payload = await this.jwtService.verifyAsync(tempToken);
    } catch (error) {
      throw new UnauthorizedException('Invalid or expired temp token');
    }

    if (payload.type !== '2fa_pending') {
      throw new UnauthorizedException('Invalid temp token');
    }

    const user = await this.userService.findById(payload.sub);
    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    if (!user.two_factor_enabled) {
      throw new UnauthorizedException('2FA is not enabled for this user');
    }

    if (token) {
      if (!user.totp_secret) {
        throw new BadRequestException('TOTP is not configured for this user');
      }

      const verified = speakeasy.totp.verify({
        secret: user.totp_secret,
        encoding: 'base32',
        token,
        window: 1,
      });

      if (!verified) {
        throw new UnauthorizedException('Invalid TOTP token');
      }
    } else if (otp) {
      await this.twoFactorAuthService.verifySmsOtp(payload.sub, otp);
    } else {
      throw new BadRequestException('OTP or TOTP token is required');
    }

    const loginTokens = await this.twoFactorAuthService.issueLoginTokens(payload.sub);
    return {
      statusCode: 200,
      message: 'Login successful',
      data: loginTokens,
    };
  }
}

