import {
  IsString,
  IsOptional,
  IsArray,
  ValidateNested,
  IsISO8601,
  IsNumber,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreateQuotationItemDto {
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

export class CreateQuotationDto {
  @IsOptional()
  @IsString()
  customerId?: string;

  @IsOptional()
  @IsString()
  customerName?: string;

  @IsOptional()
  @IsString()
  customerPhone?: string;

  @IsISO8601()
  validUntil: string; // ISO date string

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateQuotationItemDto)
  items: CreateQuotationItemDto[];

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsString()
  termsConditions?: string;
}
