import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { AddStockDto, DeductStockDto } from './dto/stock_manual.dto';
import { StockNotFoundException } from '../exceptions/stock_not_found.exception';
import { MovementType, Prisma, Stock } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/client';
import { InsufficientStockException } from '../exceptions/stock_bad_request.exception';
import { RawStockRow } from '../interfaces/row_stock.interface';
import { GetStockFilterDto } from './dto/get-stock-filter.dto';
import { StockOverviewResponse } from '../interfaces/stock-overview.interface';
import { calculateStockStatus } from 'src/utils/stockHelper';

type StockOverviewPayload = Prisma.StockGetPayload<{
  include: {
    product: { select: { name: true; sku: true; minimumStockLevel: true; sellingPrice: true; category: { select: { name: true } }; images: { select: { imageUrl: true; isPrimary: true }; orderBy: { isPrimary: 'desc' }; take: 1 } } };
    warehouse: {
      select: { name: true };
    };
  };
}>;
@Injectable()
export class StockService {
  private readonly logger = new Logger(StockService.name);

  constructor(private prisma: PrismaService) {}

  // Get stock overview with dynamic filters
  async getStockOverview(filters: GetStockFilterDto, tenantId: string) {
    this.logger.log(`Fetching stock overview for tenant=${tenantId}`);
    this.logger.debug(`Filters applied: ${JSON.stringify(filters)}`);

    const whereClause = this.buildStockWhereClause(filters, tenantId);

    const rawStocks = await this.prisma.stock.findMany({
      where: whereClause,
      include: {
        product: {
          select: {
            name: true,
            sku: true,
            minimumStockLevel: true,
            sellingPrice: true,
            category: { select: { name: true } },
            images: {
              select: { imageUrl: true, isPrimary: true },
              orderBy: { isPrimary: 'desc' },
              take: 1,
            },
          },
        },
        warehouse: { select: { name: true } },
      },
    });

    this.logger.debug(
      `Retrieved ${rawStocks.length} raw stock records from database.`,
    );

    const mappedStocks = rawStocks.map((stock) =>
      this.mapToStockOverview(stock),
    );

    const finalStocks = this.applyDynamicFilters(mappedStocks, filters);

    this.logger.log(
      `Successfully returning ${finalStocks.length} stock overview records.`,
    );
    return finalStocks;
  }

  // Get stock details for a specific product across all warehouses
  async getProductStock(productId: string, tenantId: string) {
    this.logger.log(
      `Fetching product stock details: product=${productId}, tenant=${tenantId}`,
    );

    const stocks = await this.prisma.stock.findMany({
      where: {
        productId,
        tenantId,
      },
      include: {
        product: { select: { name: true, sku: true, minimumStockLevel: true, sellingPrice: true, category: { select: { name: true } }, images: { select: { imageUrl: true, isPrimary: true }, orderBy: { isPrimary: 'desc' }, take: 1 } } },
        warehouse: { select: { name: true } },
      },
    });

    if (stocks.length === 0) {
      this.logger.warn(`No stock records found for product=${productId}`);
    }

    return stocks.map((stock) => this.mapToStockOverview(stock));
  }

  // Manual stock adjustment methods
  async addManualStock(dto: AddStockDto, userId: string, tenantId: string) {
    this.logger.log(
      `Adding manual stock: product=${dto.product_id}, warehouse=${dto.warehouse_id}, quantity=${dto.add_quantity}, user=${userId}, tenant=${tenantId}`,
    );
    return this.prisma.$transaction(async (tx) => {
      const currentStock = await this.findOrCreateStock(tx, dto, tenantId);
      this.logger.debug(
        `Current stock found: id=${currentStock.id}, quantity=${currentStock.quantity.toString()}`,
      );

      const updatedStock = await this.updateStockQuantity(
        tx,
        currentStock.id,
        dto.add_quantity,
      );
      this.logger.debug(
        `Stock updated: id=${updatedStock.id}, new quantity=${updatedStock.quantity.toString()}`,
      );

      await this.createStockMovementLog(
        tx,
        dto,
        tenantId,
        userId,
        currentStock.quantity,
        updatedStock.quantity,
        currentStock.warehouseId,
      );
      this.logger.log(
        `Stock movement log created for product=${dto.product_id}, warehouse=${dto.warehouse_id}`,
      );
      return this.buildStockResponse(updatedStock, 'Stock added successfully');
    });
  }

  // Deduct stock manually with validation
  async deductManualStock(
    dto: DeductStockDto,
    userId: string,
    tenantId: string,
  ) {
    this.logger.log(
      `Deducting manual stock: product=${dto.product_id}, warehouse=${dto.warehouse_id}, quantity=${dto.deduct_quantity}, user=${userId}, tenant=${tenantId}`,
    );
    return this.prisma.$transaction(async (tx) => {
      const currentStock = await this.findOrCreateStock(tx, dto, tenantId);
      this.logger.debug(
        `Current stock found: id=${currentStock.id}, quantity=${currentStock.quantity.toString()}, reserved=${currentStock.reservedQuantity.toString()}`,
      );

      const availableDecimal = currentStock.quantity.minus(
        currentStock.reservedQuantity,
      );
      if (availableDecimal.lessThan(dto.deduct_quantity)) {
        const available = availableDecimal.toNumber();
        this.logger.warn(
          `Insufficient stock: available=${available}, requested=${dto.deduct_quantity}`,
        );
        throw new InsufficientStockException(available, dto.deduct_quantity);
      }

      const updatedStock = await this.updateStockQuantity(
        tx,
        currentStock.id,
        -dto.deduct_quantity,
      );
      this.logger.debug(
        `Stock updated: id=${updatedStock.id}, new quantity=${updatedStock.quantity.toString()}`,
      );

      await this.createStockMovementLog(
        tx,
        dto,
        tenantId,
        userId,
        currentStock.quantity,
        updatedStock.quantity,
        currentStock.warehouseId,
      );
      this.logger.log(
        `Stock movement log created for product=${dto.product_id}, warehouse=${dto.warehouse_id}`,
      );
      return this.buildStockResponse(
        updatedStock,
        'Stock deducted successfully',
      );
    });
  }

  private async findOrCreateStock(
    tx: Prisma.TransactionClient,
    dto: {
      product_id: string;
      variant_id?: string | null;
      warehouse_id: string;
    },
    tenantId: string,
  ): Promise<Stock> {
    // We can leave it as any[] because we know the DB returns snake_case rows
    const stocks: RawStockRow[] = await tx.$queryRaw<RawStockRow[]>`
      SELECT * FROM "stock" 
      WHERE "product_id" = ${dto.product_id}::uuid 
        AND "warehouse_id" = ${dto.warehouse_id}::uuid 
        AND "tenant_id" = ${tenantId}::uuid
        AND ${dto.variant_id ? Prisma.sql`"variant_id" = ${dto.variant_id}::uuid` : Prisma.sql`"variant_id" IS NULL`}
      FOR UPDATE;
    `;

    if (!stocks || stocks.length === 0) {
      this.logger.warn(`Stock not found: product=${dto.product_id}, warehouse=${dto.warehouse_id}. Auto-creating...`);
      
      let warehouseId = dto.warehouse_id;

      // Auto-create stock record if missing
      let warehouse = await tx.warehouse.findUnique({
        where: { id: warehouseId },
        select: { id: true, branchId: true }
      });
      
      if (!warehouse) {
        // Try finding any active warehouse
        warehouse = await tx.warehouse.findFirst({
           where: { tenantId, isActive: true },
           select: { id: true, branchId: true }
        });

        // If still no warehouse, auto-create branch and warehouse
        if (!warehouse) {
           let branch = await tx.branch.findFirst({ where: { tenantId, isActive: true } });
           if (!branch) {
              branch = await tx.branch.create({
                 data: { tenantId, name: 'Main Branch', code: 'BR-' + Date.now(), isActive: true }
              });
           }
           warehouse = await tx.warehouse.create({
              data: { tenantId, branchId: branch.id, name: 'Main Warehouse', code: 'WH-' + Date.now(), isActive: true }
           });
        }
        warehouseId = warehouse.id;
      }

      const newStock = await tx.stock.create({
        data: {
          tenantId,
          productId: dto.product_id,
          variantId: dto.variant_id || null,
          warehouseId: warehouseId,
          branchId: warehouse.branchId,
          quantity: 0,
        }
      });
      
      return newStock;
    }

    const rawStock = stocks[0];

    // Explicitly map snake_case DB columns to camelCase Prisma fields!
    return {
      id: rawStock.stock_id, // Map stock_id to id
      tenantId: rawStock.tenant_id,
      productId: rawStock.product_id,
      variantId: rawStock.variant_id,
      warehouseId: rawStock.warehouse_id,
      branchId: rawStock.branch_id,
      quantity: new Decimal(rawStock.quantity ?? 0),
      reservedQuantity: new Decimal(rawStock.reserved_quantity ?? 0),
      damagedQuantity: new Decimal(rawStock.damaged_quantity ?? 0),
      lastUpdated: rawStock.last_updated,
    } as Stock;
  }

  private updateStockQuantity(
    tx: Prisma.TransactionClient,
    stockId: string,
    addQty: number,
  ) {
    this.logger.debug(
      `Updating stock quantity: stockId=${stockId}, addQty=${addQty}`,
    );
    return tx.stock.update({
      where: { id: stockId },
      data: {
        quantity: { increment: addQty },
      },
    });
  }

  private createStockMovementLog(
    tx: Prisma.TransactionClient,
    dto: AddStockDto | DeductStockDto,
    tenantId: string,
    userId: string,
    beforeQty: Decimal,
    afterQty: Decimal,
    actualWarehouseId: string,
  ) {
    let quantity: number;
    let referenceType: string;

    if ('add_quantity' in dto) {
      quantity = dto.add_quantity;
      referenceType = 'manual_add';
    } else if ('deduct_quantity' in dto) {
      quantity = -dto.deduct_quantity;
      referenceType = 'manual_deduct';
    } else {
      quantity = 0;
      referenceType = 'unknown';
    }

    this.logger.debug(
      `Creating stock movement log: product=${dto.product_id}, warehouse=${actualWarehouseId}, quantity=${quantity}, before=${beforeQty.toString()}, after=${afterQty.toString()}, referenceType=${referenceType}`,
    );
    return tx.stockMovement.create({
      data: {
        tenantId,
        productId: dto.product_id,
        variantId: dto.variant_id,
        warehouseId: actualWarehouseId,
        movementType: MovementType.ADJUSTMENT,
        quantity,
        beforeQuantity: beforeQty,
        afterQuantity: afterQty,
        referenceType,
        notes: dto.reason,
        createdBy: userId,
      },
    });
  }

  private buildStockResponse(
    updatedStock: Stock,
    message = 'Stock updated successfully',
  ) {
    const quantity = updatedStock.quantity.toNumber();
    const reservedQuantity = updatedStock.reservedQuantity.toNumber();

    return {
      success: true,
      message,
      quantity,
      reserved_quantity: reservedQuantity,
      available_quantity: quantity - reservedQuantity,
    };
  }

  private buildStockWhereClause(
    filters: GetStockFilterDto,
    tenantId: string,
  ): Prisma.StockWhereInput {
    const whereClause: Prisma.StockWhereInput = { tenantId };

    if (filters.warehouse_id) {
      whereClause.warehouseId = filters.warehouse_id;
    }

    if (filters.branch_id) {
      whereClause.branchId = filters.branch_id;
    }

    if (filters.search) {
      whereClause.product = {
        OR: [
          { name: { contains: filters.search, mode: 'insensitive' } },
          { sku: { contains: filters.search, mode: 'insensitive' } },
        ],
      };
    }

    return whereClause;
  }

  private mapToStockOverview(
    stock: StockOverviewPayload,
  ): StockOverviewResponse {
    const quantity = Number(stock.quantity);
    const reserved = Number(stock.reservedQuantity);

    const stockStatus = calculateStockStatus(
      quantity,
      reserved,
      stock.product.minimumStockLevel
        ? Number(stock.product.minimumStockLevel)
        : 0,
    );

    return {
      product_id: stock.productId,
      variant_id: stock.variantId,
      warehouse_id: stock.warehouseId,
      warehouse_name: stock.warehouse?.name,
      product_name: stock.product.name,
      sku: stock.product.sku,
      selling_price: Number(stock.product.sellingPrice),
      category_name: stock.product.category?.name || 'All',
      image_url: (stock.product as any).images?.[0]?.imageUrl ?? null,
      quantity,
      reserved_quantity: reserved,
      available_quantity: stockStatus.available_quantity,
      damaged_quantity: Number(stock.damagedQuantity),
      low_stock: stockStatus.low_stock,
      out_of_stock: stockStatus.out_of_stock,
    };
  }
  private applyDynamicFilters(
    stocks: StockOverviewResponse[],
    filters: GetStockFilterDto,
  ) {
    const isLowStockRequested = filters.low_stock === 'true';
    const isOutOfStockRequested = filters.out_of_stock === 'true';

    if (!isLowStockRequested && !isOutOfStockRequested) {
      return stocks;
    }

    this.logger.debug(
      `Applying in-memory filters: low_stock=${isLowStockRequested}, out_of_stock=${isOutOfStockRequested}`,
    );

    return stocks.filter((s) => {
      if (isLowStockRequested && isOutOfStockRequested) {
        return s.low_stock === true || s.out_of_stock === true;
      }

      if (isLowStockRequested) return s.low_stock === true;
      if (isOutOfStockRequested) return s.out_of_stock === true;

    });
  }

  async getStockTrend(tenantId: string, startDateStr?: string, endDateStr?: string) {
    this.logger.log(`Generating stock trend for tenant=${tenantId}, start=${startDateStr}, end=${endDateStr}`);
    
    let startDate = new Date();
    if (startDateStr) {
      startDate = new Date(startDateStr);
    } else {
      startDate.setDate(startDate.getDate() - 30);
    }

    let endDate = new Date();
    if (endDateStr) {
      endDate = new Date(endDateStr);
    }

    const movements = await this.prisma.stockMovement.findMany({
      where: {
        tenantId,
        createdAt: {
          gte: startDate,
          lte: endDate,
        },
      },
      select: {
        movementType: true,
        quantity: true,
        createdAt: true,
      },
      orderBy: {
        createdAt: 'asc',
      },
    });

    const trendMap = new Map<string, { in: number; out: number }>();
    
    // Calculate difference in days
    const diffTime = Math.abs(endDate.getTime() - startDate.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) || 1;
    
    // Limit to max 90 days to keep the chart clean and high performance
    const limitDays = Math.min(diffDays, 90);

    for (let i = limitDays - 1; i >= 0; i--) {
      const d = new Date(endDate);
      d.setDate(d.getDate() - i);
      const label = d.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit' });
      trendMap.set(label, { in: 0, out: 0 });
    }

    movements.forEach((m) => {
      const label = new Date(m.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit' });
      if (trendMap.has(label)) {
        const current = trendMap.get(label)!;
        const qty = Math.abs(Number(m.quantity));
        if (m.movementType === 'IN' || m.movementType === 'RETURN') {
          current.in += qty;
        } else if (m.movementType === 'OUT' || m.movementType === 'DAMAGE') {
          current.out += qty;
        } else if (m.movementType === 'ADJUSTMENT') {
          const rawQty = Number(m.quantity);
          if (rawQty > 0) {
            current.in += rawQty;
          } else {
            current.out += Math.abs(rawQty);
          }
        }
        trendMap.set(label, current);
      }
    });

    return Array.from(trendMap.entries()).map(([name, val]) => ({
      name,
      in: Math.round(val.in),
      out: Math.round(val.out),
    }));
  }
}
