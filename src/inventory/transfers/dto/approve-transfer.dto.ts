import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsArray, IsNumber, ValidateNested, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class ApproveItemDto {
  @ApiProperty({ example: 'transfer-item-uuid-123' })
  @IsString()
  id: string;

  @ApiProperty({ example: 50 })
  @IsNumber()
  @Min(0)
  quantity_sent: number;
}

export class ApproveTransferDto {
  @ApiPropertyOptional({ example: 'user-uuid-123' })
  @IsOptional()
  @IsString()
  approved_by?: string;

  @ApiProperty({ type: [ApproveItemDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ApproveItemDto)
  items: ApproveItemDto[];
}