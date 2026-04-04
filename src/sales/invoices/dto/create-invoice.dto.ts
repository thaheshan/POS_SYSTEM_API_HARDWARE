import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString, IsOptional, IsArray, IsNumber,
  ValidateNested, Min, IsIn,
} from 'class-validator';
import { Type } from 'class-transformer';

export class InvoiceItemDto {
  @ApiProperty({ example: 'product-uuid-001' })
  @IsString()
  product_id: string;

  @ApiProperty({ example: 10 })
  @IsNumber()
  @Min(0.01)
  quantity: number;

  @ApiProperty({ example: 250.00 })
  @IsNumber()
  @Min(0)
  unit_price: number;

  @ApiProperty({ example: 200.00 })
  @IsNumber()
  @Min(0)
  cost_price: number;

  @ApiPropertyOptional({ example: 0 })
  @IsOptional()
  @IsNumber()
  discount?: number;

  @ApiProperty({ enum: ['standard_vat', 'zero_vat', 'exempt'] })
  @IsIn(['standard_vat', 'zero_vat', 'exempt'])
  tax_category: string;
}

export class PaymentDto {
  @ApiProperty({ enum: ['cash', 'card', 'bank', 'credit', 'split'] })
  @IsIn(['cash', 'card', 'bank', 'credit', 'split'])
  payment_method: string;

  @ApiProperty({ example: 5000.00 })
  @IsNumber()
  @Min(0)
  amount: number;

  @ApiPropertyOptional({ example: 'TXN-123456' })
  @IsOptional()
  @IsString()
  reference?: string;
}

export class CreateInvoiceDto {
  @ApiProperty({ example: 'tenant-uuid-001' })
  @IsString()
  tenant_id: string;

  @ApiProperty({ example: 'branch-uuid-001' })
  @IsString()
  branch_id: string;

  @ApiProperty({ example: 'BRANCH-001' })
  @IsString()
  branch_code: string;

  @ApiProperty({ example: 'cashier-uuid-001' })
  @IsString()
  cashier_id: string;

  @ApiPropertyOptional({ example: 'customer-uuid-001' })
  @IsOptional()
  @IsString()
  customer_id?: string;

  @ApiPropertyOptional({ example: 'warehouse-uuid-001' })
  @IsOptional()
  @IsString()
  warehouse_id?: string;

  @ApiPropertyOptional({ example: 100.00 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  discount_total?: number;

  @ApiProperty({ type: [InvoiceItemDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => InvoiceItemDto)
  items: InvoiceItemDto[];

  @ApiProperty({ type: [PaymentDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PaymentDto)
  payments: PaymentDto[];
}