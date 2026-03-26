import {
  Injectable,
  UnauthorizedException,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
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
    private readonly userService: UserService,
    private readonly jwtService: JwtService,
  ) {}

  async login(loginDto: LoginDto) {
    const { email, password } = loginDto;

    try {
      const user = await this.userService.findByEmailWithCredentials(email);

      if (!user) {
        throw new UnauthorizedException('Invalid email or password');
      }

      const isPasswordValid = await bcrypt.compare(
        password,
        user.password_hash,
      );

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
