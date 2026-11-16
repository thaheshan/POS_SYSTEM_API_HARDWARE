import { Controller, Post, Body, Req, UseGuards, Logger, Get } from '@nestjs/common';
import { HardwareService } from './hardware.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';

@ApiTags('Hardware')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('hardware')
export class HardwareController {
  private readonly logger = new Logger(HardwareController.name);

  constructor(private readonly hardwareService: HardwareService) {}

  /**
   * POST /hardware/open-drawer
   * Forwards ESC/POS drawer kick to the local print agent running on the till PC.
   * The print agent URL is stored per-shop in settings (feature flags table).
   */
  @Post('open-drawer')
  async openDrawer(@Req() req: any) {
    const tenantId = req.user?.tenantId;
    this.logger.log(`[Hardware] Cash drawer kick requested by tenant: ${tenantId}`);
    return this.hardwareService.openDrawer(tenantId);
  }

  /**
   * GET /hardware/agent-status
   * Check if the configured print agent is reachable from the server.
   */
  @Get('agent-status')
  async agentStatus(@Req() req: any) {
    const tenantId = req.user?.tenantId;
    return this.hardwareService.checkAgentStatus(tenantId);
  }
}
