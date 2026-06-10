import {
  Controller,
  Get,
  Logger,
  Req,
  SetMetadata,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { RolesGuard } from 'src/auth/guards/roles.guard';
import type { AuthRequest } from 'src/common/interfaces/auth-request.interface';
import { HealthService } from 'src/health/services/health/health.service';

@Controller('system')
@UseGuards(JwtAuthGuard, RolesGuard)
export class HealthController {
  private readonly logger = new Logger(HealthController.name);
  constructor(private readonly healthService: HealthService) {}

  @Get('health')
  @SetMetadata('roles', ['OWNER', 'MANAGER'])
  async getHealth(@Req() req: AuthRequest) {
    this.logger.log(
      `Received request for system health check from user: ${req.user?.sub}`,
    );

    return this.healthService.checkSystemHealth();
  }
}
