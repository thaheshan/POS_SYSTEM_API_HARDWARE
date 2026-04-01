import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsArray, IsNumber, ValidateNested, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class ReceiveItemDto {
  @ApiProperty({ example: 'transfer-item-uuid-123' })
  @IsString()
  id: string;

  @ApiProperty({ example: 48 })
  @IsNumber()
  @Min(0)
  quantity_received: number;
}

export class ReceiveTransferDto {
  @ApiPropertyOptional({ example: 'user-uuid-123' })
  @IsOptional()
  @IsString()
  received_by?: string;

  @ApiProperty({ type: [ReceiveItemDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ReceiveItemDto)
  items: ReceiveItemDto[];
}