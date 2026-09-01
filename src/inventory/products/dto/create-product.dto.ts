import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsNumber,
  IsUUID,
  Min,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateProductDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  sku: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  sellType?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  measurementUnit?: string;

  @ApiProperty()
  @IsUUID()
  @IsNotEmpty()
  categoryId: string;

  @ApiPropertyOptional()
  @IsUUID()
  @IsOptional()
  subcategoryId?: string;

  @ApiPropertyOptional()
  @IsUUID()
  @IsOptional()
  brandId?: string;

  @ApiPropertyOptional()
  @IsUUID()
  @IsOptional()
  unitId?: string;

  @ApiPropertyOptional()
  @IsNumber()
  @IsOptional()
  @Min(0)
  purchasePrice?: number;

  @ApiProperty()
  @IsNumber()
  @IsNotEmpty()
  @Min(0)
  sellingPrice: number;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  taxCategory?: string;

  @ApiPropertyOptional()
  @IsNumber()
  @IsOptional()
  taxRate?: number;

  @ApiPropertyOptional()
  @IsNumber()
  @IsOptional()
  @Min(0)
  minimumStockLevel?: number;

  @ApiPropertyOptional()
  @IsNumber()
  @IsOptional()
  @Min(0)
  initialStock?: number;

  @ApiPropertyOptional()
  @IsUUID()
  @IsOptional()
  warehouseId?: string;

  @ApiPropertyOptional()
  @IsUUID()
  @IsOptional()
  branchId?: string;
}
