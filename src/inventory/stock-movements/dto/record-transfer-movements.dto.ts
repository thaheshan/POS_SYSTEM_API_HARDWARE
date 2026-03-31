export class RecordTransferMovementsDto {
  transferId: string;
  fromWarehouseId: string;
  toWarehouseId: string;
  items: Array<{
    productId: string;
    variantId: string | null;
    quantity: string; // from Decimal
  }>;
  tenantId: string;
}
