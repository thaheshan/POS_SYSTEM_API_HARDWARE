export interface RawStockRow {
  stock_id: string;
  tenant_id: string;
  product_id: string;
  variant_id: string | null;
  warehouse_id: string;
  branch_id: string;
  quantity: string | number;
  reserved_quantity: string | number;
  damaged_quantity: string | number;
  last_updated: Date;
}
