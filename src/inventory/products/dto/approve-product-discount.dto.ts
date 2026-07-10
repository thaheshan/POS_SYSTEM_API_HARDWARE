import { IsBoolean, IsNotEmpty } from 'class-validator';

export class ApproveProductDiscountDto {
  @IsNotEmpty()
  @IsBoolean()
  isDiscountApproved: boolean;
}
