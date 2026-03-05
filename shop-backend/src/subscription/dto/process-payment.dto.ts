import { IsNotEmpty, IsNumber, IsString, Min } from 'class-validator';

export class ProcessPaymentDto {
  @IsNumber()
  @Min(0.01, { message: 'Amount must be greater than 0' })
  @IsNotEmpty()
  amount!: number;

  @IsString()
  @IsNotEmpty()
  payment_method!: string;
}
