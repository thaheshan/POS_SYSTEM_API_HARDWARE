import { IsString, IsOptional, IsBoolean, IsNumber, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateWarehouseDto {
  @ApiProperty({ example: 'Branch 2 Warehouse' })
  @IsString()
  name: string;

  @ApiPropertyOptional({ example: 'WH-02' })
  @IsOptional()
  @IsString()
  code?: string;

  @ApiPropertyOptional({ example: '123 Main St' })
  @IsOptional()
  @IsString()
  address?: string;

  @ApiPropertyOptional({ example: 5000 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  capacity?: number;
  
  @ApiPropertyOptional({ example: 'branch-uuid' })
  @IsOptional()
  @IsString()
  branchId?: string;
}

export class UpdateWarehouseDto {
  @ApiPropertyOptional({ example: 'Branch 2 Warehouse' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ example: 'WH-02' })
  @IsOptional()
  @IsString()
  code?: string;

  @ApiPropertyOptional({ example: '123 Main St' })
  @IsOptional()
  @IsString()
  address?: string;

  @ApiPropertyOptional({ example: 5000 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  capacity?: number;

  @ApiPropertyOptional({ example: false })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
