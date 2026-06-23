export interface CategoryNode {
  id: string;
  categoryName: string;
  categoryCode: string;
  iconUrl: string | null;
  displayOrder: number | null;
  productCount: number;
  children: CategoryNode[];
}
