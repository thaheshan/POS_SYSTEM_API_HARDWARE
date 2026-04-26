import { Logger } from '@nestjs/common';
import { Prisma, PrismaClient } from '@prisma/client';

const AUDIT_LOGGER_CONTEXT = 'AuditLogger';

function toSafeLogValue(value: unknown, fallback = 'unknown'): string {
  if (typeof value !== 'string') return fallback;
  const trimmed = value.trim();
  if (!trimmed) return fallback;
  return trimmed.replace(/[\r\n\t]+/g, ' ');
}

function toErrorStack(error: unknown): string | undefined {
  if (error instanceof Error) return error.stack;
  try {
    return JSON.stringify(error);
  } catch {
    return String(error);
  }
}

export function writeAuditLogSafe(
  prisma: PrismaClient,
  data: Prisma.AuditLogUncheckedCreateInput,
): void {
  const entityType = toSafeLogValue(data.entityType, 'entity');
  const entityId = toSafeLogValue(data.entityId, 'id');

  void prisma.auditLog
    .create({ data })
    .then(() => {
      Logger.log(
        `Audit log recorded for ${entityType} ${entityId}`,
        AUDIT_LOGGER_CONTEXT,
      );
    })
    .catch((error: unknown) => {
      Logger.error(
        `CRITICAL: Failed to write audit log for ${entityType}`,
        toErrorStack(error),
        AUDIT_LOGGER_CONTEXT,
      );
    });
}

export async function writeAuditLogStrict(
  prisma: PrismaClient,
  data: Prisma.AuditLogUncheckedCreateInput,
): Promise<void> {
  const entityType = toSafeLogValue(data.entityType, 'entity');
  const entityId = toSafeLogValue(data.entityId, 'id');

  await prisma.auditLog.create({ data });

  Logger.log(
    `Audit log recorded (strict) for ${entityType} ${entityId}`,
    AUDIT_LOGGER_CONTEXT,
  );
}

export const auditLog = writeAuditLogSafe;
