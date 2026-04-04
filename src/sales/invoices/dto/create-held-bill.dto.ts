import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsArray, IsOptional } from 'class-validator';

export class CreateHeldBillDto {
  @ApiProperty({ example: 'cashier-uuid-001' })
  @IsString()
  cashier_id: string;

  @ApiProperty({ example: [{ product_id: 'p1', quantity: 2, unit_price: 100 }] })
  @IsArray()
  cart_items: any[];

  @ApiPropertyOptional()
  @IsOptional()
  reserved_stock?: any;
}