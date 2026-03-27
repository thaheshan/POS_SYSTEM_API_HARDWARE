import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsBoolean, IsIn } from 'class-validator';

export class UpdateWarehouseDto {
  @ApiPropertyOptional({ example: 'Kandy Main Store Updated' })
  @IsOptional()
  @IsString()
  warehouse_name?: string;

  @ApiPropertyOptional({ example: 'WH-KDY-002' })
  @IsOptional()
  @IsString()
  warehouse_code?: string;

  @ApiPropertyOptional({ enum: ['main', 'branch_store', 'damage', 'transit'] })
  @IsOptional()
  @IsIn(['main', 'branch_store', 'damage', 'transit'])
  warehouse_type?: string;

  @ApiPropertyOptional({ example: '456 Kandy Road' })
  @IsOptional()
  @IsString()
  address?: string;

  @ApiPropertyOptional({ example: false })
  @IsOptional()
  @IsBoolean()
  is_default_for_pos?: boolean;

  @ApiPropertyOptional({ example: 'branch-uuid-456' })
  @IsOptional()
  @IsString()
  branch_id?: string;
}