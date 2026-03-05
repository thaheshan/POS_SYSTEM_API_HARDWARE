/* eslint-disable @typescript-eslint/no-unsafe-call */
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional, IsDateString } from 'class-validator';

export class HealthResponseDto {
  @ApiProperty({
    description: 'Current status of the backend service',
    enum: ['UP', 'DOWN'] as const,
    example: 'UP',
  })
  @IsIn(['UP', 'DOWN'])
  status: 'UP' | 'DOWN';

  @ApiPropertyOptional({
    description: 'ISO 8601 timestamp of the health check',
    example: '2026-03-04T10:30:00.000Z',
  })
  @IsOptional()
  @IsDateString()
  timestamp?: string;
}
