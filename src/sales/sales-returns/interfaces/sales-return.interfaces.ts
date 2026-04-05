import { Decimal } from '@prisma/client/runtime/client';

export interface InvoiceItem {
  id: string;
  quantity: Decimal;
}
