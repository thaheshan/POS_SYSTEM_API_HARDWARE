import { PrismaService } from '../../prisma/prisma.service';

export async function generateInvoiceNumber(
  prisma: PrismaService,
  branch_code: string,
): Promise<string> {
  const year = new Date().getFullYear();

  const last = await prisma.salesInvoice.findFirst({
    where: {
      invoiceNumber: {
        startsWith: `INV-${branch_code}-${year}-`,
      },
    },
    orderBy: { invoiceNumber: 'desc' },
  });

  let sequence = 1;
  if (last) {
    const parts = last.invoiceNumber.split('-');
    sequence = parseInt(parts[parts.length - 1]) + 1;
  }

  return `INV-${branch_code}-${year}-${String(sequence).padStart(5, '0')}`;
}