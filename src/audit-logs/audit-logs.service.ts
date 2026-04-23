import {
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';

import { GetAuditLogsDto } from './dto/get-audit-logs.dto';
import {
  AuditLogResponse,
  PaginatedAuditLogs,
} from './interfaces/audit-log.interface';
import { Prisma } from '@prisma/client';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class AuditLogsService {
  private readonly logger = new Logger(AuditLogsService.name);
  constructor(private readonly prisma: PrismaService) {}

  async getLogs(
    tenantId: string,
    dto: GetAuditLogsDto,
  ): Promise<PaginatedAuditLogs> {
    this.logger.log(
      `Fetching audit logs for tenant: ${tenantId}, page: ${dto.page || 1}`,
    );

    try {
      const whereClause = this.buildWhereClause(tenantId, dto);

      const page = dto.page ? Number(dto.page) : 1;
      const limit = dto.limit ? Number(dto.limit) : 50;
      const skip = (page - 1) * limit;

      const [total, rawLogs] = await this.prisma.$transaction([
        this.prisma.auditLog.count({ where: whereClause }),
        this.prisma.auditLog.findMany({
          where: whereClause,
          skip: skip,
          take: limit,
          orderBy: { timestamp: 'desc' },
        }),
      ]);

      const data: AuditLogResponse[] = rawLogs.map((log) => ({
        id: log.id,
        userId: log.userId,
        action: log.action,
        entityType: log.entityType,
        entityId: log.entityId,
        oldValues: log.oldValues as Record<string, unknown> | null,
        newValues: log.newValues as Record<string, unknown> | null,
        ipAddress: log.ipAddress,
        timestamp: log.timestamp,
      }));

      return {
        data,
        meta: {
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit),
        },
      };
    } catch (error) {
      this.logger.error(
        `Failed to fetch audit logs for tenant ${tenantId}`,
        (error as Error).stack,
      );
      throw new InternalServerErrorException(
        'An error occurred while fetching audit logs',
      );
    }
  }

  generateCsv(logs: AuditLogResponse[]): string {
    this.logger.log(`Generating CSV export for ${logs.length} records`);

    if (logs.length === 0) return 'No data available\n';

    const headers = [
      'ID',
      'Timestamp',
      'User ID',
      'Action',
      'Entity Type',
      'Entity ID',
      'IP Address',
    ];
    const rows = logs.map((log) => [
      log.id,
      log.timestamp.toISOString(),
      log.userId || 'System',
      log.action,
      log.entityType,
      log.entityId,
      log.ipAddress || 'N/A',
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map((row) => row.join(',')),
    ].join('\n');

    return csvContent;
  }

  private buildWhereClause(
    tenantId: string,
    dto: GetAuditLogsDto,
  ): Prisma.AuditLogWhereInput {
    const where: Prisma.AuditLogWhereInput = { tenantId };

    if (dto.userId) where.userId = dto.userId;
    if (dto.entityType) where.entityType = dto.entityType;
    if (dto.actionType) where.action = dto.actionType;

    if (dto.startDate || dto.endDate) {
      where.timestamp = {};
      if (dto.startDate) where.timestamp.gte = new Date(dto.startDate);
      if (dto.endDate) where.timestamp.lte = new Date(dto.endDate);
    }

    return where;
  }
}
