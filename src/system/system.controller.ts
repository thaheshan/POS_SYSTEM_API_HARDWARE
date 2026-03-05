/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import {
  Controller,
  Get,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { PrismaService } from '../prisma/prisma.service';
import { HealthResponseDto } from './dto/health-response.dto';

@ApiTags('System')
@Controller()
export class SystemController {
  private readonly logger = new Logger(SystemController.name);
  constructor(private prisma: PrismaService) {}

  @Get('api/health')
  @ApiOperation({ summary: 'Check the health of the backend service' })
  @ApiResponse({ status: 200, type: HealthResponseDto })
  @ApiResponse({ status: 500, description: 'Internal Server Error' })
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
}
