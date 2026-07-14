import { IsNotEmpty, IsString } from 'class-validator';

export class VerifyShopDto {
  @IsString()
  @IsNotEmpty()
  shopId!: string;

  @IsString()
  @IsNotEmpty()
  privateId!: string;
}
