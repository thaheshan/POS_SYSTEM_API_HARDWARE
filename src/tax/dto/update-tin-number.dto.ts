import { IsString, IsNotEmpty, MaxLength, Matches } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateTinNumberDto {
  @ApiProperty({ example: 'TAX-ABC-123456' })
  @IsString()
  @IsNotEmpty({ message: 'tin_number must not be empty' })
  @MaxLength(50, { message: 'tin_number must not exceed 50 characters' })
  @Matches(/^[A-Z0-9\-]+$/, { message: 'tin_number format is invalid' })
  tin_number: string;
}
