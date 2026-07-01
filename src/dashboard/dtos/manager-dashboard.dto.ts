import {
  IsNumber,
  IsObject,
  IsArray,
  IsOptional,
  IsString,
} from 'class-validator';
import { PaymentBreakdownDto, ChartDataPointDto } from './dashboard-chart.dto';

export class ManagerDashboardResponseDto {
  @IsString()
  branch_id: string;

  @IsNumber()
  revenue_today: number;

  @IsNumber()
  @IsOptional()
  vs_yesterday_pct: number;

  @IsNumber()
  active_held_bills: number;

  @IsNumber()
  held_bills_value: number;

  @IsArray()
  @IsOptional()
  staff_performance: Array<{
    cashier_id: string;
    name: string;
    transactions: number;
    revenue: number;
  }>;

  @IsArray()
  @IsOptional()
  top_products: ChartDataPointDto[];

  @IsArray()
  @IsOptional()
  reorder_alerts: Array<{
    product_id: string;
    product_name: string;
    current_quantity: number;
    reorder_quantity: number;
    status: string; // 'critical' | 'low'
  }>;

  @IsNumber()
  branch_stock_value: number;

  @IsNumber()
  total_transactions_today: number;

  @IsNumber()
  average_bill_today: number;

  @IsObject()
  @IsOptional()
  payment_breakdown: PaymentBreakdownDto;

  @IsNumber()
  branch_gross_profit: number;

  @IsNumber()
  @IsOptional()
  average_margin_pct: number;

  @IsNumber()
  @IsOptional()
  customer_count_today: number;

  @IsNumber()
  @IsOptional()
  new_customers_today: number;

  generated_at: string; // ISO timestamp
}
