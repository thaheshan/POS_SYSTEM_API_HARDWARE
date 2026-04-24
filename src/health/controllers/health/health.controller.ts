import {
  Controller,
  ForbiddenException,
  Get,
  Logger,
  Req,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import type { AuthRequest } from 'src/common/interfaces/auth-request.interface';
import { HealthService } from 'src/health/services/health/health.service';

@Controller('system')
@UseGuards(JwtAuthGuard)
export class HealthController {
  private readonly logger = new Logger(HealthController.name);
  constructor(private readonly healthService: HealthService) {}

  @Get('health')
  async getHealth(@Req() req: AuthRequest) {
    this.logger.log('Received request for system health check');
    const userRole = req.user?.role;
    this.logger.log(
      `User ${req.user?.sub} (Role: ${userRole}) requested system health.`,
    );

    const allowedRoles = ['owner', 'manager'];
    if (!userRole || !allowedRoles.includes(userRole)) {
      this.logger.warn(
        `Access denied to system health for user ${req.user?.sub} with role ${userRole}`,
      );

      throw new ForbiddenException({
        error: 'ROLE_ACCESS_DENIED',
        required_role: allowedRoles,
      });
    }

    return this.healthService.checkSystemHealth();
  }
}
