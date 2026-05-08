import { IsOptional, IsString, IsUUID, IsBooleanString } from 'class-validator';

export class GetStockFilterDto {
  @IsOptional()
  @IsUUID()
  warehouse_id?: string;

  @IsOptional()
  @IsUUID()
  branch_id?: string;

  @IsOptional()
  @IsBooleanString()
  low_stock?: string;

  @IsOptional()
  @IsBooleanString()
  out_of_stock?: string;

  @IsOptional()
  @IsString()
  search?: string;
}
