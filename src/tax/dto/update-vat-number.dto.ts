import { IsString, IsNotEmpty, MaxLength, Matches } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateVatNumberDto {
  @ApiProperty({ example: 'VAT-LK-987654' })
  @IsString()
  @IsNotEmpty({ message: 'vat_number must not be empty' })
  @MaxLength(50, { message: 'vat_number must not exceed 50 characters' })
  @Matches(/^[A-Z0-9\-]+$/, { message: 'vat_number format is invalid' })
  vat_number: string;
}
