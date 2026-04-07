import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsArray, IsOptional } from 'class-validator';

export class CreateHeldBillDto {
  @ApiProperty({ example: 'cashier-uuid-001' })
  @IsString()
  cashier_id: string;

  @ApiPropertyOptional({ example: 'warehouse-uuid-001' })
  @IsOptional()
  @IsString()
  warehouse_id?: string; 

  @ApiProperty()
  @IsArray()
  cart_items: any[];

  @ApiPropertyOptional()
  @IsOptional()
  reserved_stock?: any;
}