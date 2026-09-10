import { IsBoolean, IsEnum, IsNumber, IsOptional, Min } from 'class-validator';
import { Type } from 'class-transformer';

export enum DiscountType {
  PERCENTAGE = 'PERCENTAGE',
  FIXED_AMOUNT = 'FIXED_AMOUNT',
}

export class UpdateProductDiscountConfigDto {
  @IsOptional()
  @IsBoolean()
  isDiscountEnabled?: boolean;

  @IsOptional()
  @IsEnum(DiscountType)
  discountType?: DiscountType;

  @IsOptional()
  @IsNumber()
  @Min(0, { message: 'Maximum allowed discount cannot be negative' })
  @Type(() => Number)
  maxAllowedDiscount?: number;

  @IsOptional()
  @IsNumber()
  @Min(0, { message: 'Default discount value cannot be negative' })
  @Type(() => Number)
  defaultDiscountValue?: number;

  @IsOptional()
  @IsBoolean()
  hasSecondaryDiscount?: boolean;

  @IsOptional()
  @IsEnum(DiscountType)
  secondaryDiscountType?: DiscountType;

  @IsOptional()
  @IsNumber()
  @Min(0, { message: 'Maximum secondary discount cannot be negative' })
  @Type(() => Number)
  maxSecondaryDiscount?: number;

  @IsOptional()
  @IsNumber()
  @Min(0, { message: 'Default secondary discount cannot be negative' })
  @Type(() => Number)
  defaultSecondaryDiscount?: number;
}
