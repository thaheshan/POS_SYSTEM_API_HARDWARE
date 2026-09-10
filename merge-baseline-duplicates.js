require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const { Pool } = require('pg');

let prisma;
let pool;
try {
  pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
  });
  const adapter = new PrismaPg(pool);
  prisma = new PrismaClient({ adapter });
} catch (e) {
  prisma = new PrismaClient();
}

async function mergeBaselineDuplicates() {
  const shops = await prisma.shop.findMany();
  let shop = shops.find(s => s.id.toLowerCase().includes('3924fc6c'));
  if (!shop && shops.length > 0) shop = shops[0];
  if (!shop) throw new Error('No shop found in database!');

  console.log(`Starting merge of baseline duplicate products for Shop ${shop.id}...`);

  const products = await prisma.product.findMany({
    where: { tenantId: shop.id },
    include: { stocks: true },
    orderBy: { createdAt: 'asc' },
  });

  const nameMap = new Map();
  products.forEach(p => {
    const key = p.name.trim().toLowerCase();
    if (!nameMap.has(key)) nameMap.set(key, []);
    nameMap.get(key).push(p);
  });

  let mergedCount = 0;

  for (const [nameKey, group] of nameMap.entries()) {
    if (group.length > 1) {
      // Keep the first product (primary), merge others into it
      const primary = group[0];
      const duplicates = group.slice(1);

      let totalAddedQty = 0;

      for (const dup of duplicates) {
        const dupQty = dup.stocks.reduce((sum, s) => sum + (Number(s.quantity) || 0), 0);
        totalAddedQty += dupQty;

        // Clean up all foreign key references before deleting duplicate product
        try {
          if (prisma.productImage) {
            await prisma.productImage.deleteMany({ where: { productId: dup.id } });
          }
        } catch (e) {}

        try {
          if (prisma.stockMovement) {
            await prisma.stockMovement.deleteMany({ where: { productId: dup.id } });
          }
        } catch (e) {}

        try {
          if (prisma.supplierProduct) {
            await prisma.supplierProduct.deleteMany({ where: { productId: dup.id } });
          }
        } catch (e) {}

        // Delete stock records
        await prisma.stock.deleteMany({ where: { productId: dup.id } });

        // Delete duplicate product
        await prisma.product.delete({ where: { id: dup.id } });
      }

      // Add merged quantity to primary product stock
      const primaryStock = await prisma.stock.findFirst({
        where: { tenantId: shop.id, productId: primary.id },
      });

      if (primaryStock) {
        await prisma.stock.update({
          where: { id: primaryStock.id },
          data: {
            quantity: { increment: totalAddedQty },
            availableQuantity: { increment: totalAddedQty },
          },
        });
      }

      mergedCount++;
      console.log(`✅ Merged "${primary.name}" (${duplicates.map(d => d.sku).join(', ')} -> ${primary.sku}): Combined +${totalAddedQty} Qty into ${primary.sku}`);
    }
  }

  console.log(`\n🎉 Successfully merged ${mergedCount} duplicate product pairs into clean master records!`);
}

mergeBaselineDuplicates()
  .catch(console.error)
  .finally(() => {
    prisma.$disconnect();
    if (pool) pool.end();
  });
