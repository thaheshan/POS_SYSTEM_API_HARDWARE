import { IsUUID, IsNumber, IsString, IsOptional, Min } from 'class-validator';

export class AddStockDto {
  @IsUUID()
  product_id: string;

  @IsOptional()
  @IsUUID()
  variant_id?: string;

  @IsUUID()
  warehouse_id: string;

  @IsUUID()
  branch_id: string;

  @IsNumber()
  @Min(0.01) // Prevent adding 0 or negative stock
  add_quantity: number;

  @IsString()
  reason: string;
}

export class DeductStockDto {
  @IsUUID()
  product_id: string;

  @IsOptional()
  @IsUUID()
  variant_id?: string;

  @IsUUID()
  warehouse_id: string;

  @IsUUID()
  branch_id: string;

  @IsNumber()
  @Min(0.01)
  deduct_quantity: number;

  @IsString()
  reason: string;
}
