import { IsNumber, IsArray, IsOptional, IsString } from 'class-validator';

export class TransactionDetailDto {
  @IsString()
  invoice_id: string;

  @IsString()
  invoice_number: string;

  @IsNumber()
  amount: number;

  @IsString()
  sale_type: string;

  generated_at: string; // ISO timestamp
}

export class HeldBillDto {
  @IsString()
  invoice_id: string;

  @IsString()
  invoice_number: string;

  @IsNumber()
  amount: number;

  @IsString()
  @IsOptional()
  customer_name: string;

  created_at: string; // ISO timestamp
}

export class CashierDashboardResponseDto {
  @IsString()
  user_id: string;

  @IsNumber()
  my_transactions_today: number;

  @IsNumber()
  my_sales_value_today: number;

  @IsNumber()
  my_average_bill: number;

  @IsNumber()
  my_held_bills_count: number;

  @IsNumber()
  my_held_bills_value: number;

  @IsArray()
  @IsOptional()
  last_transactions: TransactionDetailDto[];

  @IsArray()
  @IsOptional()
  held_bills: HeldBillDto[];

  @IsNumber()
  @IsOptional()
  total_held_value: number;

  @IsNumber()
  @IsOptional()
  cash_collected_today: number;

  generated_at: string; // ISO timestamp
}
