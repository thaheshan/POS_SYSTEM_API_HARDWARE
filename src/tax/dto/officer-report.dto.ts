import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsDateString, IsIn } from 'class-validator';

export class OfficerReportDto {
  @ApiProperty({ example: 'tenant-1' })
  @IsString()
  tenant_id: string;

  @ApiPropertyOptional({ example: '2026-04-01' })
  @IsOptional()
  @IsDateString()
  from_date?: string;

  @ApiPropertyOptional({ example: '2027-03-31' })
  @IsOptional()
  @IsDateString()
  to_date?: string;

  @ApiPropertyOptional({ enum: ['current_year', 'quarter', 'custom'] })
  @IsOptional()
  @IsIn(['current_year', 'quarter', 'custom'])
  period?: string;

  @ApiPropertyOptional({ enum: ['pdf', 'excel'] })
  @IsOptional()
  @IsIn(['pdf', 'excel'])
  format?: string;
}