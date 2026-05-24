import { IsEmail, IsEnum, IsNotEmpty, IsOptional, IsString, IsUUID, MinLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Role } from '@prisma/client';

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

  @ApiProperty({ example: 'CASHIER', enum: Role, description: 'Role of the staff member' })
  @IsEnum(Role)
  @IsNotEmpty()
  role: Role;

  @ApiProperty({ example: 'password123', description: 'Password' })
  @IsString()
  @MinLength(6)
  password: string;
}
