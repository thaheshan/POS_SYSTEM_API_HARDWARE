import {
  Injectable,
  UnauthorizedException,
  InternalServerErrorException,
  BadRequestException,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import * as crypto from 'crypto';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import * as nodemailer from 'nodemailer';
import { LoginDto } from '../system/dto/login.dto';
import { UserService } from '../user/user.service';
import { TwoFactorAuthService } from './2fa/two-factor-auth.service';
import { InactiveUserException } from './exceptions/inactive-user.exception';
import { UnverifiedUserException } from './exceptions/unverified-user.exception';
import { LockedAccountException } from './exceptions/locked-account.exception';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  // Rate limiting: track last reset request time per email (in-memory)
  private readonly resetRequestMap = new Map<string, number>();

  // Brute-force protection: track failed attempts per email
  private readonly resetAttemptMap = new Map<string, number>();

  constructor(
    private readonly prisma: PrismaService,
    private readonly userService: UserService,
    private readonly jwtService: JwtService,
    private readonly twoFactorAuthService: TwoFactorAuthService,
    private readonly configService: ConfigService,
  ) {}

  async registerShopOwner(dto: import('./dto/register-shop-owner.dto').RegisterShopOwnerDto) {
    // Check if user exists
    const existingUser = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (existingUser) {
      throw new BadRequestException('Email already registered');
    }

    const hashedPassword = await bcrypt.hash(dto.password, 10);

    // Create Shop and Owner User in a transaction
    const result = await this.prisma.db.$transaction(async (prisma) => {
      const shop = await prisma.shop.create({
        data: {
          name: dto.shopName,
          businessRegistration: dto.businessRegistration,
          email: dto.email,
          subscriptionPlan: dto.subscriptionPlan,
          paymentStatus: 'PENDING',
          address: dto.address,
          city: dto.city,
          district: dto.district,
          province: dto.province,
        },
      });

      const role = await prisma.role.create({
        data: {
          name: 'OWNER',
          tenant_id: shop.id,
          permissions: { all: true },
        }
      });

      const user = await prisma.user.create({
        data: {
          tenant_id: shop.id,
          email: dto.email,
          password_hash: hashedPassword,
          first_name: dto.firstName,
          last_name: dto.lastName,
          phone: dto.phone,
          role_id: role.id,
          status: 'PENDING_APPROVAL',
          is_active: false,
          is_verified: true,
        },
      });

      return { shop, user };
    });

    return {
      message: 'Shop owner registered successfully',
      data: {
        userId: result.user.user_id,
        shopId: result.shop.id,
      },
    };
  }

  async checkStatus(email: string) {
    const user = await this.prisma.user.findUnique({
      where: { email },
      select: { status: true, is_active: true, tenant_id: true },
    });

    if (!user) {
      throw new BadRequestException('User not found');
    }

    let paymentStatus: string | null = null;
    if (user.tenant_id) {
      const shop = await this.prisma.shop.findUnique({
        where: { id: user.tenant_id },
        select: { paymentStatus: true },
      });
      paymentStatus = shop?.paymentStatus ?? null;
    }

    return {
      status: user.status,
      paymentStatus,
    };
  }

  async cancelRegistration(email: string) {
    const user = await this.prisma.user.findUnique({
      where: { email },
      select: { user_id: true, status: true, tenant_id: true },
    });

    if (!user) {
      throw new BadRequestException('User not found');
    }

    if (user.status !== 'PENDING_APPROVAL') {
      throw new BadRequestException('Only pending registrations can be cancelled');
    }

    // Delete user and shop in a transaction
    await this.prisma.$transaction(async (prisma) => {
      await prisma.user.delete({ where: { email } });
      if (user.tenant_id) {
        await prisma.shop.delete({ where: { id: user.tenant_id } });
      }
    });

    return { message: 'Registration cancelled successfully' };
  }

  async registerStaff(dto: import('./dto/register-staff.dto').RegisterStaffDto) {
    // Verify shop exists
    const shop = await this.prisma.shop.findUnique({ where: { id: dto.shopId } });
    if (!shop) {
      throw new BadRequestException('Shop not found');
    }

    // Verify shop verification code (first 8 characters of shop UUID)
    if (dto.shopVerificationCode !== shop.id.substring(0, 8)) {
      throw new BadRequestException('Invalid Shop Verification Code');
    }

    // Check if user exists
    const existingUser = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (existingUser) {
      throw new BadRequestException('Email already registered');
    }

    // Find the role by name for this shop
    const roleName = (dto.role || 'CASHIER').toUpperCase();
    const roleRecord = await this.prisma.role.findFirst({
      where: { tenant_id: shop.id, name: roleName }
    });
    if (!roleRecord) {
      throw new BadRequestException(`Role ${roleName} not found for this shop`);
    }

    const hashedPassword = await bcrypt.hash(dto.password, 10);

    const user = await this.prisma.user.create({
      data: {
        tenant_id: shop.id,
        email: dto.email,
        password_hash: hashedPassword,
        first_name: dto.firstName,
        last_name: dto.lastName,
        phone: dto.phone,
        role_id: roleRecord.id,
        status: 'PENDING_APPROVAL',
        is_active: true,
        is_verified: false,
      },
    });

    return {
      message: 'Staff registered successfully and is pending approval',
      data: {
        userId: user.user_id,
      },
    };
  }

  async requestPasswordReset(email: string): Promise<{ message: string }> {
    // Fix 4: Rate limiting — 1 request per minute per email
    const lastRequest = this.resetRequestMap.get(email);
    if (lastRequest && Date.now() - lastRequest < 60 * 1000) {
      throw new HttpException(
        'Please wait 1 minute before requesting another reset code',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user) {
      return { message: 'If this email is registered, a reset code will be sent.' };
    }

    const code = crypto.randomInt(100000, 999999).toString();
    const expiry = new Date(Date.now() + 15 * 60 * 1000);

    // Log the code for local development testing
    if (process.env.NODE_ENV !== 'production') {
      this.logger.log(`[DEV ONLY] Password reset code for ${email}: ${code}`);
    }

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

    // Fix 1: Remove plaintext log — send email instead
    try {
      const transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: Number(process.env.SMTP_PORT),
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASSWORD,
        },
      });

      await transporter.sendMail({
        from: process.env.EMAIL_FROM,
        to: email,
        subject: 'Password Reset Code',
        text: `Your password reset code is: ${code}\n\nThis code expires in 15 minutes.\n\nIf you did not request this, please ignore this email.`,
        html: `<p>Your password reset code is: <strong>${code}</strong></p><p>This code expires in 15 minutes.</p><p>If you did not request this, please ignore this email.</p>`,
      });
    } catch (error) {
      this.logger.error('Failed to send reset email', error);
      throw new InternalServerErrorException('Failed to send reset email');
    }

    // Track rate limit timestamp
    this.resetRequestMap.set(email, Date.now());

    return { message: 'Verification email sent successfully' };
  }

  async resetPassword(
    email: string,
    verification_code: string,
    new_password: string,
  ): Promise<{ message: string }> {
    // Fix 5: Brute-force protection — max 5 attempts
    const attempts = this.resetAttemptMap.get(email) ?? 0;
    if (attempts >= 5) {
      throw new HttpException(
        'Too many failed attempts. Please request a new reset code.',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user) {
      throw new UnauthorizedException('Invalid or expired verification code');
    }

    if (!user.password_reset_token || !user.password_reset_expiry) {
      throw new UnauthorizedException('No password reset request found');
    }

    if (user.password_reset_used) {
      throw new UnauthorizedException('Verification code already used');
    }

    if (user.password_reset_expiry < new Date()) {
      this.resetAttemptMap.delete(email);
      throw new UnauthorizedException('Verification code has expired');
    }

    if (user.password_reset_token !== verification_code) {
      // Increment failed attempt counter
      this.resetAttemptMap.set(email, attempts + 1);
      throw new UnauthorizedException('Invalid verification code');
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

    // Clear attempt counter on success
    this.resetAttemptMap.delete(email);
    this.resetRequestMap.delete(email);

    return { message: 'Password updated successfully' };
  }

  async login(loginDto: LoginDto) {
    const email = loginDto.email.trim();
    const password = loginDto.password;

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

      // Check PENDING / REJECTED before is_active so we return useful info
      if (user.status === 'PENDING_APPROVAL') {
        // Return special error with shop info so frontend can redirect properly
        const shop = user.tenant_id
          ? await this.prisma.shop.findUnique({ where: { id: user.tenant_id } })
          : null;
        throw new HttpException(
          {
            statusCode: 403,
            message: 'APPROVAL_WAITING',
            data: {
              status: 'PENDING_APPROVAL',
              subscriptionPlan: shop?.subscriptionPlan ?? null,
              paymentStatus: shop?.paymentStatus ?? null,
            },
          },
          HttpStatus.FORBIDDEN,
        );
      }

      if (user.status === 'REJECTED') {
        throw new UnauthorizedException('Account has been rejected by administration');
      }

      let shopInfo: { subscriptionPlan?: string | null; paymentStatus?: string | null; subscriptionStatus?: string | null; logoUrl?: string | null } = {};
      if (user.role === 'OWNER' && user.tenant_id) {
        const shop = await this.prisma.shop.findUnique({ where: { id: user.tenant_id } });
        if (shop) {
          shopInfo = { 
            subscriptionPlan: shop.subscriptionPlan, 
            paymentStatus: shop.paymentStatus,
            subscriptionStatus: shop.subscriptionStatus,
            logoUrl: shop.logo_url
          };
        }
      }

      if (shopInfo.subscriptionStatus === 'SUSPENDED') {
        throw new HttpException(
          {
            statusCode: 403,
            message: 'ACCOUNT_SUSPENDED',
            data: { status: 'SUSPENDED' },
          },
          HttpStatus.FORBIDDEN,
        );
      }

      if (!user.is_active) {
        // If owner is approved but hasn't paid, allow login so they can access /payment
        if (!(user.role === 'OWNER' && user.status === 'APPROVED' && shopInfo.paymentStatus === 'PENDING')) {
          throw new InactiveUserException();
        }
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
        const temp_token = await this.jwtService.signAsync(tempPayload, {
          expiresIn: '5m',
          secret: this.configService.getOrThrow<string>('JWT_2FA_SECRET'),
        });

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

      // shopInfo is already fetched above

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
            ...shopInfo,
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
      payload = await this.jwtService.verifyAsync(tempToken, {
        secret: this.configService.getOrThrow<string>('JWT_2FA_SECRET'),
      });
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
      await this.twoFactorAuthService.verifyTOTP(payload.sub, token);
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

  async completePayment(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { user_id: userId } });
    if (!user || !user.tenant_id) {
      throw new BadRequestException('User or shop not found');
    }

    const tenantId = user.tenant_id;

    await this.prisma.$transaction(async (prisma) => {
      await prisma.shop.update({
        where: { id: tenantId },
        data: { paymentStatus: 'PAID' },
      });
      await prisma.user.update({
        where: { user_id: userId },
        data: { is_active: true },
      });
    });

    return { message: 'Payment completed. Account is now active.' };
  }

  async completePaymentByEmail(email: string) {
    const user = await this.prisma.user.findUnique({
      where: { email },
      select: { user_id: true, tenant_id: true, status: true, role: true },
    });

    if (!user || !user.tenant_id) {
      throw new BadRequestException('User or shop not found');
    }

    if (user.status !== 'APPROVED') {
      throw new BadRequestException('Account is not approved for payment');
    }

    const tenantId = user.tenant_id;

    await this.prisma.$transaction(async (prisma) => {
      await prisma.shop.update({
        where: { id: tenantId },
        data: { paymentStatus: 'PAID' },
      });
      await prisma.user.update({
        where: { user_id: user.user_id },
        data: { is_active: true },
      });
    });

    return { 
      message: 'Payment completed. Account is now active.',
      accountDetails: {
        shopId: tenantId,
        email: email,
      }
    };
  }
}