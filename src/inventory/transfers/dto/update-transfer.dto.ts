import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsArray, IsNumber, ValidateNested, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { TransferItemDto } from './create-transfer.dto';

export class UpdateTransferDto {
  @ApiPropertyOptional({ example: 'warehouse-uuid-001' })
  @IsOptional()
  @IsString()
  from_warehouse_id?: string;

  @ApiPropertyOptional({ example: 'warehouse-uuid-002' })
  @IsOptional()
  @IsString()
  to_warehouse_id?: string;

  @ApiPropertyOptional({ type: [TransferItemDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TransferItemDto)
  items?: TransferItemDto[];
}