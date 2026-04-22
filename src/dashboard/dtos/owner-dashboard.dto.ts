import { IsNumber, IsObject, IsArray, IsOptional } from 'class-validator';
import {
  RevenueChartDto,
  CategoryChartDto,
  StaffChartDto,
  PaymentBreakdownDto,
  ChartDataPointDto,
} from './dashboard-chart.dto';

export class OwnerDashboardResponseDto {
  @IsNumber()
  revenue_today: number;

  @IsNumber()
  @IsOptional()
  vs_yesterday_pct: number;

  @IsNumber()
  gross_profit_today: number;

  @IsNumber()
  vat_collected: number;

  @IsNumber()
  low_stock_count: number;

  @IsNumber()
  out_of_stock_count: number;

  @IsNumber()
  total_stock_value: number;

  @IsNumber()
  total_transactions_today: number;

  @IsNumber()
  average_bill_today: number;

  @IsArray()
  @IsOptional()
  top_products: ChartDataPointDto[];

  @IsObject()
  @IsOptional()
  category_chart: CategoryChartDto;

  @IsArray()
  @IsOptional()
  staff_performance: Array<{
    cashier_id: string;
    name: string;
    transactions: number;
    revenue: number;
  }>;

  @IsNumber()
  ytd_tax_estimate: number;

  @IsNumber()
  ytd_revenue: number;

  @IsNumber()
  ytd_profit: number;

  @IsObject()
  @IsOptional()
  payment_breakdown: PaymentBreakdownDto;

  @IsNumber()
  @IsOptional()
  cash_in_hand: number;

  @IsNumber()
  @IsOptional()
  pending_payments: number;

  @IsNumber()
  @IsOptional()
  average_margin_pct: number;

  generated_at: string; // ISO timestamp
}
