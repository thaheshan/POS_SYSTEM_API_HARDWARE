import { IsString, IsNumber, Min, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class TransferStockDto {
  @ApiProperty({ example: 'product-uuid' })
  @IsString()
  productId: string;

  @ApiProperty({ example: 'source-warehouse-uuid' })
  @IsString()
  sourceWarehouseId: string;

  @ApiProperty({ example: 'dest-warehouse-uuid' })
  @IsString()
  destinationWarehouseId: string;

  @ApiProperty({ example: 10 })
  @IsNumber()
  @Min(0.01)
  quantity: number;

  @ApiPropertyOptional({ example: 'Transferring extra stock to Branch 2' })
  @IsOptional()
  @IsString()
  reason?: string;
}
