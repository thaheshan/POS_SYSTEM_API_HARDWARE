export interface CategoryNode {
  id: string;
  name: string;
  product_count: number;
  children: CategoryNode[];
}
