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
}
