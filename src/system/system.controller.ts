/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import {
  Controller,
  Get,
  Logger,
  ServiceUnavailableException,
  UseGuards,
  Req,
} from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { PrismaService } from '../prisma/prisma.service';
import { HealthResponseDto } from './dto/health-response.dto';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { Request } from 'express';
import type { JwtPayload } from 'src/auth/interfaces/jwt-payload.interface';

interface AuthenticatedRequest extends Request {
  user: JwtPayload;
}

@ApiTags('System')
@Controller()
export class SystemController {
  private readonly logger = new Logger(SystemController.name);
  constructor(private prisma: PrismaService) {}

  // Health check endpoint
  @Get('health')
  @ApiOperation({ summary: 'Check the health of the backend service' })
  @ApiResponse({ status: 200, type: HealthResponseDto })
  @ApiResponse({ status: 503, description: 'Service Unavailable' })
  async healthCheck() {
    try {
      await this.prisma.$queryRaw`SELECT 1`;

      this.logger.log('Health check successful');
      return {
        status: 'UP',
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      this.logger.error('Error occurred while checking health', error);
      throw new ServiceUnavailableException({
        status: 'DOWN',
        timestamp: new Date().toISOString(),
      });
    }
  }

  // get system configurations
  @Get('config')
  @ApiOperation({ summary: 'Get system configurations' })
  @ApiResponse({ status: 200, type: HealthResponseDto })
  getConfig() {
    this.logger.log('Fetching system configuration');
    return {
      app_version: process.env.APP_VERSION || '1.0.0',
      powered_by: 'Futura Solutions',
      maintenance_mode: process.env.MAINTENANCE_MODE === 'true',
    };
  }

  // get active shops for staff registration
  @Get('shops')
  @ApiOperation({ summary: 'Get list of active shops for registration' })
  @ApiResponse({ status: 200, description: 'List of shops' })
  async getShops() {
    this.logger.log('Fetching active shops for registration');
    const shops = await this.prisma.shop.findMany({
      where: {
        paymentStatus: 'PAID',
      },
      select: {
        id: true,
        name: true,
      },
      orderBy: {
        name: 'asc',
      },
    });
    return shops;
  }

  // get active warehouses for authenticated tenant
  @Get('warehouses')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Get list of active warehouses for tenant' })
  @ApiResponse({ status: 200, description: 'List of warehouses' })
  async getWarehouses(@Req() req: AuthenticatedRequest) {
    const tenantId = req.user.tenant_id;
    this.logger.log(`Fetching active warehouses for tenant=${tenantId}`);
    return this.prisma.warehouse.findMany({
      where: {
        tenantId,
        isActive: true,
      },
      select: {
        id: true,
        name: true,
        code: true,
        address: true,
      },
      orderBy: {
        name: 'asc',
      },
    });
  }
}
