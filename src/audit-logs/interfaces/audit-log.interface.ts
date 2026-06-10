import { AuditAction } from '@prisma/client';
export interface AuditLogResponse {
  id: string;
  userId: string | null;
  action: AuditAction;
  entityType: string;
  entityId: string;
  oldValues: Record<string, unknown> | null;
  newValues: Record<string, unknown> | null;
  ipAddress: string | null;
  timestamp: Date;
}

export interface PaginatedAuditLogs {
  data: AuditLogResponse[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}
