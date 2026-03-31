import {
  IsOptional,
  IsString,
  IsEnum,
  IsISO8601,
  Min,
  Max,
} from 'class-validator';
import { Type } from 'class-transformer';
import { StockMovementType } from '@prisma/client';

export class GetStockMovementsDto {
  @IsOptional()
  @IsString()
  productId?: string;

  @IsOptional()
  @IsString()
  variantId?: string;

  @IsOptional()
  @IsString()
  warehouseId?: string;

  @IsOptional()
  @IsEnum(StockMovementType)
  movementType?: StockMovementType;

  @IsOptional()
  @IsString()
  createdBy?: string;

  @IsOptional()
  @IsISO8601()
  startDate?: string;

  @IsOptional()
  @IsISO8601()
  endDate?: string;

  @IsOptional()
  @Type(() => Number)
  @Min(1)
  @Max(500)
  limit?: number = 50;

  @IsOptional()
  @IsString()
  cursor?: string;

  @IsOptional()
  @IsString()
  referenceType?: string;

  @IsOptional()
  @IsString()
  referenceId?: string;
}

export class StockMovementResponse {
  id: string;
  tenantId: string;
  productId: string;
  variantId: string | null;
  warehouseId: string | null;
  movementType: StockMovementType;
  quantity: string;
  beforeQuantity: string | null;
  afterQuantity: string | null;
  unitCost: string | null;
  totalCost: string | null;
  referenceType: string | null;
  referenceId: string | null;
  notes: string | null;
  createdBy: string | null;
  createdAt: Date;

  // Relations (nullable because optional in DB)
  product: {
    id: string;
    name: string;
    sku: string;
    barcode: string | null;
  } | null;

  variant: {
    id: string;
    variantName: string | null;
    sku: string;
  } | null;

  warehouse: {
    id: string;
    warehouseName: string;
    warehouseCode: string | null;
  } | null;

  creator: {
    user_id: string;
    first_name: string | null;
    last_name: string | null;
    email: string;
  } | null;
}

export class StockMovementsPaginatedResponse {
  data: StockMovementResponse[];
  pagination: {
    nextCursor: string | null;
    hasMore: boolean;
    limit: number;
  };
}
