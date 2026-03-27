import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsBoolean, IsIn } from 'class-validator';

export class CreateWarehouseDto {
  @ApiProperty({ example: 'tenant-uuid-123' })
  @IsString()
  tenant_id: string;

  @ApiPropertyOptional({ example: 'branch-uuid-123' })
  @IsOptional()
  @IsString()
  branch_id?: string;

  @ApiProperty({ example: 'Kandy Main Store' })
  @IsString()
  warehouse_name: string;

  @ApiProperty({ example: 'WH-KDY-001' })
  @IsString()
  warehouse_code: string;

  @ApiProperty({ enum: ['main', 'branch_store', 'damage', 'transit'] })
  @IsIn(['main', 'branch_store', 'damage', 'transit'])
  warehouse_type: string;

  @ApiPropertyOptional({ example: '123 Kandy Road' })
  @IsOptional()
  @IsString()
  address?: string;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  is_active?: boolean;

  @ApiPropertyOptional({ example: false })
  @IsOptional()
  @IsBoolean()
  is_default_for_pos?: boolean;

  @ApiPropertyOptional({ example: 'user-uuid-123' })
  @IsOptional()
  @IsString()
  created_by?: string;
}