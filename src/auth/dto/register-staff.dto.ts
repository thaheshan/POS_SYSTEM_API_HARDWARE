import { IsEmail, IsNotEmpty, IsOptional, IsString, IsUUID, MinLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class RegisterStaffDto {
  @ApiProperty({ example: 'uuid', description: 'ID of the shop' })
  @IsUUID()
  @IsNotEmpty()
  shopId: string;

  @ApiProperty({ example: '8-char-code', description: 'Shop Verification Code from owner' })
  @IsString()
  @IsNotEmpty()
  shopVerificationCode: string;

  @ApiProperty({ example: 'John', description: 'First name' })
  @IsString()
  @IsNotEmpty()
  firstName: string;

  @ApiProperty({ example: 'Doe', description: 'Last name' })
  @IsString()
  @IsNotEmpty()
  lastName: string;

  @ApiProperty({ example: 'staff@myshop.com', description: 'Email address' })
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @ApiPropertyOptional({ example: '+1234567890', description: 'Phone number' })
  @IsString()
  @IsOptional()
  phone?: string;

  @ApiProperty({ example: 'uuid-of-role', description: 'Role ID of the staff member' })
  @IsString()
  @IsNotEmpty()
  role: string;

  @ApiProperty({ example: 'password123', description: 'Password' })
  @IsString()
  @MinLength(6)
  password: string;
}
