import {
  IsEmail,
  IsNotEmpty,
  IsString,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

class OwnerDto {
  @IsString()
  @IsNotEmpty()
  full_name!: string;

  @IsEmail()
  email!: string;

  @IsString()
  @IsNotEmpty()
  mobile_number!: string;

  @IsString()
  @MinLength(8)
  password!: string;
}

class ShopDetailsDto {
  @IsString()
  @IsNotEmpty()
  shop_name!: string;

  @IsString()
  @IsNotEmpty()
  registration_number!: string;

  @IsString()
  @IsNotEmpty()
  tax_number!: string;

  @IsString()
  @IsNotEmpty()
  address!: string;
}

export class RegisterShopDto {
  @ValidateNested()
  @Type(() => OwnerDto)
  owner!: OwnerDto;

  @ValidateNested()
  @Type(() => ShopDetailsDto)
  shop!: ShopDetailsDto;

  @IsString()
  @IsNotEmpty()
  subscription_plan!: string;
}
