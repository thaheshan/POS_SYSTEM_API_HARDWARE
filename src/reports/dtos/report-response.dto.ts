export class PaymentBreakdownDto {
  cash: number;
  card: number;
  credit: number;
  percentages: {
    cash: number;
    card: number;
    credit: number;
  };
}

export class CategoryRankingDto {
  category_id: string;
  name: string;
  revenue: number;
  revenue_pct: number; // Percentage of total revenue
  profit_margin: number; // Percentage profit margin for category
  vs_yesterday_pct: number; // % change vs yesterday (0 if no previous day)
  top_product: string; // Product name with highest revenue in category
}

export class StaffPerformanceDto {
  cashier_id: string;
  name: string;
  transactions: number;
  revenue: number;
}

export class InventoryAlertDto {
  product_id: string;
  name: string;
  quantity?: number; // For low-stock items
  status?: 'low_stock' | 'out_of_stock';
}

export class ReportResponseDto {
  id: string;
  tenant_id: string;
  branch_id: string | null;
  report_date: string;

  // Overall KPIs
  total_revenue: number;
  total_transactions: number;
  average_bill: number;
  largest_transaction: number;
  smallest_transaction: number;

  // Payment Breakdown
  payment_breakdown: PaymentBreakdownDto;

  // Profit & Expenses
  cogs: number; // Cost of Goods Sold
  gross_profit: number;
  operating_expenses: number;
  net_profit: number;

  // VAT
  vat_collected: number;
  vat_paid: number;
  net_vat: number;

  // Nested Arrays
  category_rankings: CategoryRankingDto[];
  staff_performance: StaffPerformanceDto[];
  low_stock_items: InventoryAlertDto[];
  out_of_stock_items: InventoryAlertDto[];

  created_at: string;
  updated_at: string;
}
