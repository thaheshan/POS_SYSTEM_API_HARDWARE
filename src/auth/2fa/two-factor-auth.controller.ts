import {
  BadRequestException,
  Controller,
  Post,
  Body,
  UseGuards,
  Req,
  UnauthorizedException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { JwtService } from '@nestjs/jwt';
import { TwoFactorAuthService } from './two-factor-auth.service';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { Request } from 'express';
import { AuthUser } from '../interfaces/auth-user.interface';

interface AuthenticatedRequest extends Request {
  user?: AuthUser;
}

@ApiTags('Two-Factor Authentication')
@Controller('2fa')
export class TwoFactorAuthController {
  constructor(
    private readonly twoFactorAuthService: TwoFactorAuthService,
    private readonly jwtService: JwtService,
  ) {}

  private async verifyTempToken(tempToken: string) {
    if (!tempToken) {
      throw new BadRequestException('temp_token is required');
    }

    try {
      const payload = await this.jwtService.verifyAsync(tempToken);
      if (payload.type !== '2fa_pending') {
        throw new BadRequestException('Invalid temp token');
      }
      return payload as { sub: string; type: string };
    } catch (error) {
      throw new BadRequestException('Invalid or expired temp_token');
    }
  }

  @Post('setup')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Setup TOTP for user' })
  @ApiResponse({ status: 200, description: 'TOTP secret and QR code URL' })
  async setup(@Req() req: AuthenticatedRequest) {
    const userId = req.user?.user_id;
    if (!userId) {
      throw new UnauthorizedException('Authenticated user not found');
    }

    return this.twoFactorAuthService.setupTOTP(userId);
  }

  @Post('verify')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Verify TOTP token' })
  @ApiResponse({ status: 200, description: 'TOTP verified and enabled' })
  async verify(@Req() req: AuthenticatedRequest, @Body() body: { token: string }) {
    const userId = req.user?.user_id;
    if (!userId) {
      throw new UnauthorizedException('Authenticated user not found');
    }

    await this.twoFactorAuthService.verifyTOTP(userId, body.token);
    return { message: 'TOTP verified and enabled' };
  }

  @Post('send-otp')
  @ApiOperation({ summary: 'Send SMS OTP' })
  @ApiResponse({ status: 200, description: 'OTP sent' })
  async sendOtp(@Body('temp_token') tempToken: string) {
    const payload = await this.verifyTempToken(tempToken);
    await this.twoFactorAuthService.sendSmsOtp(payload.sub);
    return { message: 'OTP sent' };
  }

  @Post('verify-otp')
  @ApiOperation({ summary: 'Verify SMS OTP' })
  @ApiResponse({ status: 200, description: 'Login tokens issued after OTP verification' })
  async verifyOtp(@Body() body: { temp_token: string; otp: string }) {
    const payload = await this.verifyTempToken(body.temp_token);
    await this.twoFactorAuthService.verifySmsOtp(payload.sub, body.otp);
    return this.twoFactorAuthService.issueLoginTokens(payload.sub);
  }
}