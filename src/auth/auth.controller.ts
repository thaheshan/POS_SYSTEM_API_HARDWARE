// src/auth/auth.controller.ts
import { Controller, Post, Body, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { LoginDto } from '../system/dto/login.dto';

@ApiTags('Authentication')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Login with email and password' })
  @ApiResponse({
    status: 200,
    description: 'Login successful, returns JWT token and role',
  })
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
}

