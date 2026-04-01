import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsArray, IsNumber, ValidateNested, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class TransferItemDto {
  @ApiProperty({ example: 'product-uuid-123' })
  @IsString()
  product_id: string;

  @ApiProperty({ example: 50 })
  @IsNumber()
  @Min(0.01)
  quantity_requested: number;
}

export class CreateTransferDto {
  @ApiProperty({ example: 'tenant-uuid-123' })
  @IsString()
  tenant_id: string;

  @ApiProperty({ example: 'warehouse-uuid-001' })
  @IsString()
  from_warehouse_id: string;

  @ApiProperty({ example: 'warehouse-uuid-002' })
  @IsString()
  to_warehouse_id: string;

  @ApiPropertyOptional({ example: 'user-uuid-123' })
  @IsOptional()
  @IsString()
  created_by?: string;

  @ApiProperty({ type: [TransferItemDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TransferItemDto)
  items: TransferItemDto[];
}