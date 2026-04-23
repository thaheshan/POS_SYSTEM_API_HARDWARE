import {
  Controller,
  Get,
  Logger,
  Query,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { AuditLogsService } from './audit-logs.service';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import type { AuthenticatedRequest } from 'src/common/interfaces/authenticated-request.interface';
import type { GetAuditLogsDto } from './dto/get-audit-logs.dto';
import type { Response } from 'express';

@Controller('audit-logs')
@UseGuards(JwtAuthGuard)
export class AuditLogsController {
  private readonly logger = new Logger(AuditLogsController.name);
  constructor(private readonly auditLogsService: AuditLogsService) {}

  @Get()
  async getAuditLogs(
    @Req() req: AuthenticatedRequest,
    @Query() queryDto: GetAuditLogsDto,
    @Res() res: Response,
  ) {
    const tenantId = req.user?.tenant_id;
    this.logger.log(
      `User ${req.user?.user_id} requested audit logs with format: ${queryDto.exportFormat}`,
    );

    const paginatedLogs = await this.auditLogsService.getLogs(
      tenantId,
      queryDto,
    );

    if (queryDto.exportFormat === 'csv') {
      const csvData = this.auditLogsService.generateCsv(paginatedLogs.data);

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader(
        'Content-Disposition',
        `attachment; filename=audit_logs_${new Date().getTime()}.csv`,
      );

      res.status(200).send(csvData);
      return;
    }
    res.status(200).json({
      success: true,
      data: paginatedLogs,
    });
    return;
  }
}
