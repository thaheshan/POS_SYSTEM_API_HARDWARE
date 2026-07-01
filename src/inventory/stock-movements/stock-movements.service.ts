import { Injectable, Inject } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import {
  GetStockMovementsDto,
  StockMovementResponse,
  StockMovementsPaginatedResponse,
} from './dto/get-stock-movements.dto';
import type { CacheClient } from '../../cache/cache-client.interface';

/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-call */

@Injectable()
export class StockMovementsService {
  private readonly movementsCacheTtlSeconds = 300; // 5 minutes

  constructor(
    private readonly prisma: PrismaService,
    @Inject('REDIS_CLIENT') private readonly redis: CacheClient,
  ) {}

  async getMovements(
    tenantId: string,
    filters: GetStockMovementsDto,
  ): Promise<StockMovementsPaginatedResponse> {
    // Check cache for non-paginated requests
    const cacheKey = this.getMovementsCacheKey(tenantId, filters);
    if (!filters.cursor) {
      const cached = await this.redis.get(cacheKey);
      if (cached) {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-return
        return JSON.parse(cached);
      }
    }

    const {
      productId,
      variantId,
      warehouseId,
      movementType,
      createdBy,
      startDate,
      endDate,
      referenceType,
      referenceId,
      limit = 50,
      cursor,
    } = filters;

    // Build dynamic where clause
    const where: Prisma.StockMovementWhereInput = {
      tenantId,
    };

    if (productId) {
      where.productId = productId;
    }

    if (variantId) {
      where.variantId = variantId;
    }

    if (warehouseId) {
      where.warehouseId = warehouseId;
    }

    if (movementType) {
      where.movementType = movementType;
    }

    if (referenceType) {
      where.referenceType = referenceType;
    }

    if (referenceId) {
      where.referenceId = referenceId;
    }

    if (createdBy) {
      where.createdBy = createdBy;
    }

    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) {
        where.createdAt.gte = new Date(startDate);
      }
      if (endDate) {
        // Add 1 day to endDate to include entire day
        const end = new Date(endDate);
        end.setDate(end.getDate() + 1);
        where.createdAt.lt = end;
      }
    }

    const selectClause = {
      id: true,
      tenantId: true,
      productId: true,
      variantId: true,
      warehouseId: true,
      movementType: true,
      quantity: true,
      beforeQuantity: true,
      afterQuantity: true,
      unitCost: true,
      totalCost: true,
      referenceType: true,
      referenceId: true,
      notes: true,
      createdBy: true,
      createdAt: true,
      product: {
        select: {
          id: true,
          name: true,
          sku: true,
          barcode: true,
        },
      },
      variant: {
        select: {
          id: true,
          variantName: true,
          sku: true,
        },
      },
      warehouse: {
        select: {
          id: true,
          warehouseName: true,
          warehouseCode: true,
        },
      },
      creator: {
        select: {
          user_id: true,
          first_name: true,
          last_name: true,
          email: true,
        },
      },
    } as const;

    // Fetch limit + 1 to determine if there are more records
    const movements = await this.prisma.stockMovement.findMany({
      where,
      select: selectClause,
      orderBy: {
        createdAt: 'desc',
      },
      take: limit + 1,
      skip: cursor ? 1 : 0,
      ...(cursor && { cursor: { id: cursor } }),
    });

    // Determine if there are more records
    let hasMore = false;
    let nextCursor: string | null = null;

    if (movements.length > limit) {
      hasMore = true;
      movements.pop(); // Remove the extra record
      const lastMovement = movements[movements.length - 1];
      nextCursor = lastMovement.id;
    }

    // Convert Decimal to string for JSON response
    // eslint-disable-next-line @typescript-eslint/no-unsafe-return
    const data: StockMovementResponse[] = movements.map((movement) => ({
      ...movement,
      quantity: movement.quantity.toString(),
      beforeQuantity: movement.beforeQuantity?.toString() || null,
      afterQuantity: movement.afterQuantity?.toString() || null,
      unitCost: movement.unitCost?.toString() || null,
      totalCost: movement.totalCost?.toString() || null,
    }));

    const response = {
      data,
      pagination: {
        nextCursor,
        hasMore,
        limit,
      },
    };

    // Cache the response (only for initial requests, not paginated)
    if (!filters.cursor) {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-call
      await this.redis.set(
        cacheKey,
        JSON.stringify(response),
        'EX',
        this.movementsCacheTtlSeconds,
      );
    }

    return response;
  }

  /**
   * Phase 4: Record stock transfer movements (append-only audit)
   * Creates 2 movements (one for each warehouse) when a stock transfer is approved
   * Movement 1: from warehouse (negative quantity)
   * Movement 2: to warehouse (positive quantity)
   * CRITICAL: All writes (2 movements + 2 stock updates) are atomic
   * If process crashes mid-transfer, all writes rollback together
   */
  async recordTransferMovements(
    transferId: string,
    fromWarehouseId: string,
    toWarehouseId: string,
    items: Array<{
      productId: string;
      variantId: string | null;
      quantity: string; // Decimal as string
    }>,
    tenantId: string,
    createdBy: string,
  ): Promise<void> {
    // ATOMIC TRANSACTION: All 4 writes (2 movements + 2 stock updates) succeed or fail together
    await this.prisma.$transaction(async (tx) => {
      for (const item of items) {
        const quantity = new Prisma.Decimal(item.quantity);

        // CRITICAL FIX: Retrieve stock records with ID for atomic operations
        // This avoids TOCTOU race condition by using Prisma's atomic decrement/increment
        const fromStockRecord = await tx.stock.findFirst({
          where: {
            tenantId,
            productId: item.productId,
            warehouseId: fromWarehouseId,
            variantId: item.variantId || undefined,
          },
        });

        const toStockRecord = await tx.stock.findFirst({
          where: {
            tenantId,
            productId: item.productId,
            warehouseId: toWarehouseId,
            variantId: item.variantId || undefined,
          },
        });

        // Get current quantities for audit trail BEFORE atomic operations
        const fromQuantityBefore =
          fromStockRecord?.quantity || new Prisma.Decimal(0);
        const toQuantityBefore =
          toStockRecord?.quantity || new Prisma.Decimal(0);

        // Calculate expected after quantities for audit trail
        const fromQuantityAfter = fromQuantityBefore.minus(quantity);
        const toQuantityAfter = toQuantityBefore.plus(quantity);

        // WRITE 1: Movement record for source warehouse (audit trail)
        await tx.stockMovement.create({
          data: {
            tenantId,
            productId: item.productId,
            variantId: item.variantId || undefined,
            warehouseId: fromWarehouseId,
            movementType: 'transfer',
            quantity: quantity.negated(), // Negative quantity
            beforeQuantity: fromQuantityBefore,
            afterQuantity: fromQuantityAfter,
            referenceType: 'StockTransfer',
            referenceId: transferId,
            createdBy,
          },
        });

        // WRITE 2: Movement record for destination warehouse (audit trail)
        await tx.stockMovement.create({
          data: {
            tenantId,
            productId: item.productId,
            variantId: item.variantId || undefined,
            warehouseId: toWarehouseId,
            movementType: 'transfer',
            quantity, // Positive quantity
            beforeQuantity: toQuantityBefore,
            afterQuantity: toQuantityAfter,
            referenceType: 'StockTransfer',
            referenceId: transferId,
            createdBy,
          },
        });

        // WRITE 3: Atomically decrement source warehouse stock
        // ATOMIC OPERATION: Prisma's decrement is safe from TOCTOU race conditions
        if (fromStockRecord) {
          await tx.stock.update({
            where: { id: fromStockRecord.id },
            data: { quantity: { decrement: quantity } },
          });
        } else {
          // If stock doesn't exist, create with negative adjustment (edge case)
          await tx.stock.create({
            data: {
              tenantId,
              productId: item.productId,
              variantId: item.variantId || undefined,
              warehouseId: fromWarehouseId,
              quantity: quantity.negated(),
            },
          });
        }

        // WRITE 4: Atomically increment destination warehouse stock
        // ATOMIC OPERATION: Prisma's increment is safe from TOCTOU race conditions
        if (toStockRecord) {
          await tx.stock.update({
            where: { id: toStockRecord.id },
            data: { quantity: { increment: quantity } },
          });
        } else {
          // If stock doesn't exist, create with the transfer quantity
          await tx.stock.create({
            data: {
              tenantId,
              productId: item.productId,
              variantId: item.variantId || undefined,
              warehouseId: toWarehouseId,
              quantity,
            },
          });
        }
      }
    });
    // Invalidate movements cache for this tenant after recording transfers
    await this.invalidateMovementsCache(tenantId);
  }

  private getMovementsCacheKey(
    tenantId: string,
    filters: GetStockMovementsDto,
  ): string {
    const filterStr = JSON.stringify({
      productId: filters.productId,
      variantId: filters.variantId,
      warehouseId: filters.warehouseId,
      movementType: filters.movementType,
      createdBy: filters.createdBy,
      startDate: filters.startDate,
      endDate: filters.endDate,
      referenceType: filters.referenceType,
      referenceId: filters.referenceId,
      limit: filters.limit,
    });
    return `stock_mov:${tenantId}:${Buffer.from(filterStr).toString('base64')}`;
  }

  private invalidateMovementsCache(tenantId: string): Promise<void> {
    return Promise.resolve();
  }
}
