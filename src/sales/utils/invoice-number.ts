import { PrismaService } from '../../prisma/prisma.service';

export async function generateInvoiceNumber(
  prisma: PrismaService,
  branch_code: string,
): Promise<string> {
  const year = new Date().getFullYear();


  const last = await prisma.salesInvoice.findFirst({
    where: {
      invoice_number: {
        startsWith: `INV-${branch_code}-${year}-`,
      },
    },
    orderBy: { invoice_number: 'desc' },
  });

  let sequence = 1;
  if (last) {
    const parts = last.invoice_number.split('-');
    sequence = parseInt(parts[parts.length - 1]) + 1;
  }

  return `INV-${branch_code}-${year}-${String(sequence).padStart(5, '0')}`;
}