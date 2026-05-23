import { IsEmail, IsNotEmpty, IsOptional, IsString, MinLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class RegisterShopOwnerDto {
  @ApiProperty({ example: 'My Awesome Shop', description: 'Name of the shop' })
  @IsString()
  @IsNotEmpty()
  shopName: string;

  @ApiPropertyOptional({ example: 'BR123456', description: 'Business registration number' })
  @IsString()
  @IsOptional()
  businessRegistration?: string;

  @ApiProperty({ example: 'admin@myshop.com', description: 'Owner email address' })
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @ApiProperty({ example: 'password123', description: 'Password' })
  @IsString()
  @MinLength(6)
  password: string;

  @ApiProperty({ example: 'John', description: 'First name' })
  @IsString()
  @IsNotEmpty()
  firstName: string;

  @ApiProperty({ example: 'Doe', description: 'Last name' })
  @IsString()
  @IsNotEmpty()
  lastName: string;

  @ApiPropertyOptional({ example: '+1234567890', description: 'Phone number' })
  @IsString()
  @IsOptional()
  phone?: string;

  @ApiPropertyOptional({ example: 'Professional', description: 'Selected subscription plan' })
  @IsString()
  @IsOptional()
  subscriptionPlan?: string;
}
