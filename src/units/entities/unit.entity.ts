import { ApiProperty } from '@nestjs/swagger';

export class Unit {
  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174000' })
  id!: string;

  @ApiProperty({ example: 'Kilogram' })
  unitName!: string;

  @ApiProperty({ example: 'kg' })
  unitCode!: string;

  @ApiProperty({ example: 'Standard weight measurement', required: false })
  description?: string;
}
