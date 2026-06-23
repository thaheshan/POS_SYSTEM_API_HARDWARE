import { ApiProperty } from '@nestjs/swagger';

export class Brand {
  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174000' })
  id!: string;

  @ApiProperty({ example: 'Bosch' })
  brandName!: string;

  @ApiProperty({ example: 'Power tools and accessories', required: false })
  description?: string;
}
