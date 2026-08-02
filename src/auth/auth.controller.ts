// src/auth/auth.controller.ts
import { Controller, Post, Get, Body, Query, HttpCode, HttpStatus, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { LoginDto } from '../system/dto/login.dto';
import { PasswordResetRequestDto } from './dto/password-reset-request.dto';
import { PasswordResetDto } from './dto/password-reset.dto';
import { RegisterShopOwnerDto } from './dto/register-shop-owner.dto';
import { RegisterStaffDto } from './dto/register-staff.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';

@ApiTags('Authentication')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Register a new shop and owner' })
  @ApiResponse({ status: 201, description: 'Shop and owner registered successfully' })
  @ApiResponse({ status: 400, description: 'Email already registered or validation failed' })
  async registerShopOwner(@Body() dto: RegisterShopOwnerDto) {
    return this.authService.registerShopOwner(dto);
  }

  @Post('register/staff')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Register a new staff member (pending approval)' })
  @ApiResponse({ status: 201, description: 'Staff registered and pending approval' })
  @ApiResponse({ status: 400, description: 'Shop not found or validation failed' })
  async registerStaff(@Body() dto: RegisterStaffDto) {
    return this.authService.registerStaff(dto);
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Login with email and password' })
  @ApiResponse({ status: 200, description: 'Login successful, returns JWT token and role' })
  @ApiResponse({ status: 401, description: 'Invalid email or password' })
  @ApiResponse({ status: 403, description: 'Account inactive or unverified' })
  @ApiResponse({ status: 500, description: 'Failed to process login' })
  async login(@Body() loginDto: LoginDto) {
    return this.authService.login(loginDto);
  }

  @Post('complete-login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Complete login after 2FA' })
  @ApiResponse({ status: 200, description: 'Login completed and tokens issued' })
  async completeLogin(@Body() body: { temp_token: string; otp?: string; token?: string }) {
    return this.authService.completeLogin(body.temp_token, body.otp, body.token);
  }

  @Post('password-reset-request')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'BE-PSW-01: Initiate password reset' })
  @ApiResponse({ status: 200, description: 'Verification email sent' })
  @ApiResponse({ status: 400, description: 'Invalid email' })
  @ApiResponse({ status: 404, description: 'Email not registered' })
  async requestPasswordReset(@Body() dto: PasswordResetRequestDto) {
    return this.authService.requestPasswordReset(dto.email);
  }

  @Post('password-reset')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'BE-PSW-03 + BE-PSW-04: Reset password' })
  @ApiResponse({ status: 200, description: 'Password updated successfully' })
  @ApiResponse({ status: 400, description: 'Validation failed' })
  @ApiResponse({ status: 401, description: 'Invalid/expired code' })
  async resetPassword(@Body() dto: PasswordResetDto) {
    return this.authService.resetPassword(
      dto.email,
      dto.verification_code,
      dto.new_password,
    );
  }

  @Post('password-reset-external')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Reset password after external frontend validation' })
  @ApiResponse({ status: 200, description: 'Password updated successfully' })
  async resetPasswordExternal(@Body() body: { email: string; newPassword: string }) {
    return this.authService.resetPasswordExternal(body.email, body.newPassword);
  }

  @Get('check-status')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Poll registration approval status by email' })
  @ApiQuery({ name: 'email', required: true, type: String })
  @ApiResponse({ status: 200, description: 'Returns current status and paymentStatus' })
  async checkStatus(@Query('email') email: string) {
    return this.authService.checkStatus(email);
  }

  @Post('cancel-registration')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Cancel a pending registration and delete the shop/user' })
  @ApiResponse({ status: 200, description: 'Registration cancelled successfully' })
  @ApiResponse({ status: 400, description: 'User not found or not in PENDING_APPROVAL status' })
  async cancelRegistration(@Body() body: { email: string }) {
    return this.authService.cancelRegistration(body.email);
  }

  @Post('complete-payment')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Mark shop subscription payment as complete (authenticated)' })
  @ApiResponse({ status: 200, description: 'Payment recorded, account activated' })
  async completePayment(@Request() req: any) {
    return this.authService.completePayment(req.user.sub);
  }

  @Post('complete-payment-by-email')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Mark shop subscription payment as complete using email (pre-login)' })
  @ApiResponse({ status: 200, description: 'Payment recorded, account activated' })
  @ApiResponse({ status: 400, description: 'User not found or not approved' })
  async completePaymentByEmail(@Body() body: { email: string }) {
    return this.authService.completePaymentByEmail(body.email);
  }
}