export interface DailyRevenueMetric {
  date: string;
  revenue: number;
  isBestDay: boolean;
  isWorstDay: boolean;
}

export interface ReorderSuggestion {
  productId: string;
  productName: string;
  availableQuantity: number;
  minimumStockLevel: number;
  urgencyRatio: number;
  supplierName: string | null;
  totalOrderValue: number;
}

export interface CategoryPerformance {
  categoryId: string;
  categoryName: string;
  revenue: number;
  profitMargin: number;
  unitsSold: number;
  percentageChange: number;
  isUnderperforming: boolean;
}

export interface CustomerInsight {
  customerId: string;
  customerName: string;
  totalSpent: number;
  transactionCount: number;
}

export interface StaffPerformance {
  cashierId: string;
  cashierName: string;
  transactionCount: number;
  totalRevenue: number;
  averageBill: number;
}

export interface TaxUpdate {
  weeklyProfit: number;
  ytdIncome: number;
  estimatedTaxLiability: number;
  advanceTaxPaid: number;
  projectedBalanceDue: number;
}

export interface WeeklyAnalyticsReport {
  tenantId: string;
  weekStart: string;
  dailyRevenue: DailyRevenueMetric[];
  categoryPerformance: CategoryPerformance[];
  reorderSuggestions: ReorderSuggestion[];
  customerInsights: CustomerInsight[];
  staffPerformance: StaffPerformance[];
}

export interface MonthlyAnalyticsReport {
  tenantId: string;
  month: string;
  dailyRevenue: DailyRevenueMetric[];
  categoryPerformance: CategoryPerformance[];
  customerInsights: CustomerInsight[];
  staffPerformance: StaffPerformance[];
  taxUpdate: TaxUpdate;
  reorderSuggestions: ReorderSuggestion[];
}
