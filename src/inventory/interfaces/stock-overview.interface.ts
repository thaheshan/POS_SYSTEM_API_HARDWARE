export interface StockOverviewResponse {
  product_id: string;
  variant_id: string | null;
  warehouse_id: string;
  warehouse_name: string;
  product_name: string;
  sku: string;
  selling_price?: number;
  purchase_price?: number;
  category_name?: string;
  image_url?: string | null;
  quantity: number;
  reserved_quantity: number;
  available_quantity: number;
  damaged_quantity: number;
  minimum_stock_level?: number;
  low_stock: boolean;
  out_of_stock: boolean;
}
