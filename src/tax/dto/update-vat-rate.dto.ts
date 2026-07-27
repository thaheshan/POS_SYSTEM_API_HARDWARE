import { IsNumber, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class UpdateVatRateDto {
  @ApiProperty({ example: 18 })
  @IsNumber({}, { message: 'vat_rate must be a valid number' })
  @Min(0, { message: 'vat_rate must be a valid number' })
  @Type(() => Number)
  vat_rate: number;
}
