import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export enum TaxCategoryDto {
  standard_vat = 'standard_vat',
  zero_vat = 'zero_vat',
  exempt = 'exempt',
}

export class CreateProductVariantDto {
  @IsString()
  @IsNotEmpty()
  variant_name!: string;

  @IsString()
  @IsOptional()
  sku?: string;

  @IsString()
  @IsOptional()
  barcode?: string;

  @IsNumber()
  @Min(0)
  @IsOptional()
  purchase_price?: number;

  @IsNumber()
  @Min(0)
  @IsOptional()
  selling_price?: number;
}

export class CreateProductDto {
  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsOptional()
  sku?: string;

  @IsString()
  @IsOptional()
  barcode?: string;

  //   @IsUUID()
  @IsString()
  category_id!: string;

  @IsUUID()
  @IsOptional()
  brand_id?: string;

  @IsUUID()
  @IsOptional()
  unit_id?: string;

  @IsNumber()
  @Min(0)
  @IsOptional()
  purchase_price?: number;

  @IsNumber()
  @Min(0)
  selling_price!: number;

  @IsNumber()
  @Min(0)
  @IsOptional()
  minimum_selling_price?: number;

  @IsEnum(TaxCategoryDto)
  tax_category!: TaxCategoryDto;

  @IsNumber()
  @Min(0)
  @IsOptional()
  minimum_stock_level?: number;

  @IsNumber()
  @Min(0)
  @IsOptional()
  reorder_quantity?: number;

  @IsBoolean()
  has_variants!: boolean;

  @IsNumber()
  @Min(0)
  @IsOptional()
  warranty_months?: number;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateProductVariantDto)
  @IsOptional()
  variants?: CreateProductVariantDto[];
}
