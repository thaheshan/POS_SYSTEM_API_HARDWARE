import { IsArray, IsEnum, IsNumber, IsOptional, IsString, IsUUID, Min, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CheckoutItemDto {
  @ApiProperty()
  @IsUUID()
  productId: string;

  @ApiPropertyOptional()
  @IsUUID()
  @IsOptional()
  warehouseId?: string;

  @ApiPropertyOptional()
  @IsUUID()
  @IsOptional()
  branchId?: string;

  @ApiProperty()
  @IsNumber()
  @Min(1)
  quantity: number;

  @ApiProperty()
  @IsNumber()
  @Min(0)
  unitPrice: number;
}

export class CreateCheckoutDto {
  @ApiProperty({ type: [CheckoutItemDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CheckoutItemDto)
  items: CheckoutItemDto[];

  @ApiPropertyOptional()
  @IsNumber()
  @IsOptional()
  discount?: number;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  paymentMethod?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  notes?: string;

  @ApiPropertyOptional()
  @IsUUID()
  @IsOptional()
  customerId?: string;
}
