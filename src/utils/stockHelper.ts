export function calculateStockStatus(
  quantity: number,
  reserved: number,
  minLevel: number = 0,
) {
  const available = quantity - reserved;

  return {
    available_quantity: available,
    low_stock: available > 0 && available <= minLevel,
    out_of_stock: available <= 0,
  };
}
