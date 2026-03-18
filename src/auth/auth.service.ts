import {
  Injectable,
  UnauthorizedException,
  ForbiddenException,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { LoginDto } from '../system/dto/login.dto';

interface UserRecord {
  user_id: string;
  email: string;
  password_hash: string;
  first_name: string | null;
  last_name: string | null;
  role: string;
  is_active: boolean;
  is_verified: boolean;
  tenant_id: string;
  failed_login_attempts: number;
  account_locked_until: Date | null;
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
  ) {}

  async login(loginDto: LoginDto) {
    const { email, password } = loginDto;

    try {
      const user = (await this.prisma.db.user.findUnique({
        where: { email },
        select: {
          user_id: true,
          email: true,
          password_hash: true,
          first_name: true,
          last_name: true,
          role: true,
          is_active: true,
          is_verified: true,
          tenant_id: true,
          failed_login_attempts: true,
          account_locked_until: true,
        },
      })) as UserRecord | null;

      if (!user) {
        throw new UnauthorizedException('Invalid email or password');
      }

      const isPasswordValid = await bcrypt.compare(
        password,
        user.password_hash,
      );

      if (!isPasswordValid) {
        await this.prisma.db.user.update({
          where: { email },
          data: { failed_login_attempts: { increment: 1 } },
        });
        throw new UnauthorizedException('Invalid email or password');
      }

      if (!user.is_active) {
        throw new ForbiddenException(
          'Account is inactive. Please contact support.',
        );
      }

      if (!user.is_verified) {
        throw new ForbiddenException(
          'Account is not verified. Please check your email to verify your account.',
        );
      }

      if (user.account_locked_until && new Date() < user.account_locked_until) {
        const unlockTime = user.account_locked_until.toLocaleTimeString();
        throw new ForbiddenException(
          `Account is temporarily locked. Please try again after ${unlockTime}.`,
        );
      }

      await this.prisma.db.user.update({
        where: { email },
        data: {
          failed_login_attempts: 0,
          account_locked_until: null,
          last_login: new Date(),
        },
      });

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
        error instanceof ForbiddenException
      ) {
        throw error;
      }
      this.logger.error('Login failed', error);
      throw new InternalServerErrorException('Failed to process login');
    }
  }
}
