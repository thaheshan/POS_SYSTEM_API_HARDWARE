import {
  IsString,
  IsOptional,
  IsArray,
  ValidateNested,
  IsISO8601,
  IsNumber,
} from 'class-validator';
import { Type } from 'class-transformer';

export class UpdateQuotationItemDto {
  @IsOptional()
  @IsString()
  id?: string; // If updating existing item

  @IsString()
  productId: string;

  @IsOptional()
  @IsString()
  variantId?: string;

  @IsString()
  productName: string;

  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  quantity: number;

  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  unitPrice: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  discountPercentage?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  taxRate?: number;
}

export class UpdateQuotationDto {
  @IsOptional()
  @IsString()
  customerId?: string;

  @IsOptional()
  @IsString()
  customerName?: string;

  @IsOptional()
  @IsString()
  customerPhone?: string;

  @IsOptional()
  @IsISO8601()
  validUntil?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => UpdateQuotationItemDto)
  items?: UpdateQuotationItemDto[];

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsString()
  termsConditions?: string;
}

export class UpdateQuotationStatusDto {
  @IsString()
  status: string; // 'draft' | 'sent' | 'accepted' | 'rejected' | 'expired'
}

export class ConvertToInvoiceDto {
  @IsOptional()
  allowStockOverride?: boolean; // Allow manager to override insufficient stock
}

// Response DTOs
export class QuotationItemResponse {
  id: string;
  productId: string;
  variantId: string | null;
  productName: string;
  quantity: string; // Decimal as string
  unitPrice: string;
  discountPercentage: string | null;
  taxRate: string | null;
  lineTotal: string | null;
}

export class QuotationResponse {
  id: string;
  tenantId: string;
  quotationNumber: string;
  quotationDate: string;
  validUntil: string | null;
  customerId: string | null;
  customerName: string | null;
  customerPhone: string | null;
  subtotal: string | null;
  discountAmount: string | null;
  taxAmount: string | null;
  totalAmount: string | null;
  status: string;
  notes: string | null;
  termsConditions: string | null;
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
  items: QuotationItemResponse[];
}

export class QuotationsPaginatedResponse {
  data: QuotationResponse[];
  pagination: {
    nextCursor: string | null;
    hasMore: boolean;
    limit: number;
  };
}
