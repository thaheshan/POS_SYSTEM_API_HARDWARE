import { IsArray, IsEnum, IsNumber, IsOptional, IsString, IsUUID, Min, ValidateNested, IsDateString } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

// ─── Return ────────────────────────────────────────────────────────────────
export class ReturnItemDto {
  @ApiProperty()
  @IsUUID()
  productId: string;

  @ApiProperty()
  @IsUUID()
  invoiceItemId: string;

  @ApiProperty()
  @IsUUID()
  warehouseId: string;

  @ApiProperty()
  @IsNumber()
  @Min(1)
  quantity: number;

  @ApiProperty()
  @IsNumber()
  @Min(0)
  price: number;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  condition?: string; // GOOD | DAMAGED | EXPIRED
}

export class CreateReturnDto {
  @ApiProperty()
  @IsString()
  invoiceId: string; // can be UUID or invoiceNumber

  @ApiProperty()
  @IsString()
  reason: string;

  @ApiProperty()
  @IsString()
  refundMethod: string; // CASH | CREDIT_NOTE | EXCHANGE | ACCOUNT_DEDUCTION

  @ApiProperty()
  @IsNumber()
  refundAmount: number;

  @ApiProperty({ type: [ReturnItemDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ReturnItemDto)
  items: ReturnItemDto[];
}

// ─── Quotation ────────────────────────────────────────────────────────────
export class QuotationItemDto {
  @ApiProperty()
  @IsUUID()
  productId: string;

  @ApiProperty()
  @IsNumber()
  @Min(1)
  quantity: number;

  @ApiProperty()
  @IsNumber()
  price: number;
}

export class CreateQuotationDto {
  @ApiProperty()
  @IsString()
  customerName: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  phone?: string;

  @ApiProperty()
  @IsDateString()
  validUntil: string;

  @ApiProperty()
  @IsNumber()
  totalAmount: number;

  @ApiProperty({ type: [QuotationItemDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => QuotationItemDto)
  items: QuotationItemDto[];
}

// ─── Credit Sale ────────────────────────────────────────────────────────────
export class CreateCreditSaleDto {
  @ApiProperty()
  @IsUUID()
  customerId: string;

  @ApiProperty()
  @IsNumber()
  @Min(0)
  amount: number;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  reference?: string;

  @ApiPropertyOptional()
  @IsNumber()
  @IsOptional()
  paymentTermsDays?: number;
}

// ─── Bulk Sale ────────────────────────────────────────────────────────────
export class CreateBulkSaleDto {
  @ApiProperty()
  @IsString()
  wholesaleId: string;

  @ApiProperty()
  @IsNumber()
  subtotal: number;

  @ApiProperty()
  @IsString()
  discountType: string; // 'percentage' | 'flat'

  @ApiPropertyOptional()
  @IsNumber()
  @IsOptional()
  discountValue?: number;

  @ApiProperty()
  @IsNumber()
  discountAmount: number;

  @ApiProperty()
  @IsNumber()
  finalTotal: number;
}

// ─── Hold Sale ────────────────────────────────────────────────────────────
export class HoldSaleItemDto {
  @ApiProperty()
  @IsUUID()
  productId: string;

  @ApiProperty()
  @IsNumber()
  quantity: number;

  @ApiProperty()
  @IsNumber()
  price: number;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  name?: string;
}

export class CreateHoldSaleDto {
  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  reference?: string;

  @ApiPropertyOptional()
  @IsUUID()
  @IsOptional()
  customerId?: string;

  @ApiProperty({ type: [HoldSaleItemDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => HoldSaleItemDto)
  items: HoldSaleItemDto[];

  @ApiProperty()
  @IsNumber()
  totalAmount: number;
}

// ─── Exchange ────────────────────────────────────────────────────────────
export class ExchangeReturnedItemDto {
  @ApiProperty()
  @IsUUID()
  productId: string;

  @ApiProperty()
  @IsUUID()
  invoiceItemId: string;

  @ApiProperty()
  @IsUUID()
  warehouseId: string;

  @ApiProperty()
  @IsNumber()
  @Min(1)
  quantity: number;

  @ApiProperty()
  @IsNumber()
  @Min(0)
  price: number;
}

export class ExchangeNewItemDto {
  @ApiProperty()
  @IsUUID()
  productId: string;

  @ApiProperty()
  @IsUUID()
  warehouseId: string;

  @ApiProperty()
  @IsNumber()
  @Min(1)
  quantity: number;

  @ApiProperty()
  @IsNumber()
  @Min(0)
  price: number;
}

export class CreateExchangeDto {
  @ApiProperty()
  @IsString()
  invoiceId: string;

  @ApiProperty()
  @IsNumber()
  returnAmount: number;

  @ApiProperty()
  @IsNumber()
  newAmount: number;

  @ApiProperty()
  @IsNumber()
  delta: number;

  @ApiProperty({ type: [ExchangeReturnedItemDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ExchangeReturnedItemDto)
  returnedItems: ExchangeReturnedItemDto[];

  @ApiProperty({ type: [ExchangeNewItemDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ExchangeNewItemDto)
  newItems: ExchangeNewItemDto[];
}

// ─── Layaway ────────────────────────────────────────────────────────────
export class CreateLayawayDto {
  @ApiProperty()
  @IsString()
  customerName: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  phone?: string;

  @ApiProperty()
  @IsNumber()
  totalAmount: number;

  @ApiProperty()
  @IsNumber()
  @Min(0)
  deposit: number;

  @ApiProperty()
  @IsNumber()
  balance: number;

  @ApiProperty()
  @IsDateString()
  pickupDate: string;
}
