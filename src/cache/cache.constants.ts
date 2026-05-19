export const REDIS_CLIENT = 'REDIS_CLIENT';

/**
 * Cache TTL (Time To Live) in seconds
 * Standardized across all services for consistency and predictability
 */
export const CACHE_TTL = {
  // Short-lived: Real-time data that changes frequently
  STOCK_MOVEMENT: 60, // 1 minute - Stock levels update frequently
  QUOTATION_DETAIL: 300, // 5 minutes - Quotation data relatively stable

  // Medium-lived: Dashboard and aggregated data
  DASHBOARD: 300, // 5 minutes - Dashboard charts refresh every 5 min

  // Long-lived: End-of-day reports and batch data
  END_OF_DAY_REPORT: 1800, // 30 minutes - Reports don't change during the day

  // Meta: Cache invalidation patterns
  // When a SalesInvoice is created: invalidate QUOTATION_DETAIL + DASHBOARD
  // When a StockMovement is recorded: invalidate STOCK_MOVEMENT + DASHBOARD
  // When an end-of-day report is closed: invalidate END_OF_DAY_REPORT
} as const;

/**
 * Cache Key Patterns
 * Used by services to generate consistent cache keys
 */
export const CACHE_KEY_PATTERNS = {
  // quotations:{tenantId}:{quotationId}
  QUOTATION: (tenantId: string, quotationId: string) =>
    `quotations:${tenantId}:${quotationId}`,

  // quotations-list:{tenantId}:{statusFilter}:{limit}:{cursor}
  QUOTATIONS_LIST: (tenantId: string, filters: Record<string, any>) => {
    const filterStr = Object.entries(filters)
      .map(([k, v]) => `${k}=${v}`)
      .join(':');
    return `quotations-list:${tenantId}:${filterStr}`;
  },

  // stock:{tenantId}:{productId}:{variantId}
  STOCK: (tenantId: string, productId: string, variantId?: string) =>
    `stock:${tenantId}:${productId}:${variantId || 'default'}`,

  // dashboard:{tenantId}:{role}:{branchId}
  DASHBOARD: (tenantId: string, role: string, branchId?: string) =>
    `dashboard:${tenantId}:${role}:${branchId || 'all'}`,

  // report:{tenantId}:{type}:{date}:{branchId}
  REPORT: (tenantId: string, type: string, date: string, branchId?: string) =>
    `report:${tenantId}:${type}:${date}:${branchId || 'all'}`,
} as const;
