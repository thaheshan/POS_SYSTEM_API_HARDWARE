import { IsNotEmpty, IsObject, IsString, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

class PaymentDetailsDto {
  @IsString()
  @IsNotEmpty()
  card_number!: string;

  @IsString()
  @IsNotEmpty()
  card_holder_name!: string;

  @IsString()
  @IsNotEmpty()
  expiry!: string;

  @IsString()
  @IsNotEmpty()
  cvv!: string;
}

export class PaymentMethodDto {
  @IsString()
  @IsNotEmpty()
  payment_method!: string;

  @ValidateNested()
  @Type(() => PaymentDetailsDto)
  @IsObject()
  details!: PaymentDetailsDto;
}
