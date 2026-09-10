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

async function combineBajajFans() {
  console.log('🚀 Starting Bajaj Fans Merge Script...');

  const shops = await prisma.shop.findMany();
  let shop = shops.find(s => s.id.toLowerCase().includes('3924fc6c')) || shops[0];
  if (!shop) throw new Error('❌ No shop found in DB!');

  console.log(`✅ Tenant / Shop: ${shop.name} (${shop.id})`);

  // Target Fan Colors to Merge
  const colors = ['Black', 'White', 'Brown', 'Ivory'];

  for (const color of colors) {
    console.log(`\n🔍 Processing Bajaj Ceiling Fan (${color})...`);

    // Find all products matching this color
    const products = await prisma.product.findMany({
      where: {
        tenantId: shop.id,
        name: { contains: `Bajaj`, mode: 'insensitive' },
        AND: [
          { name: { contains: `Fan`, mode: 'insensitive' } },
          { name: { contains: color, mode: 'insensitive' } }
        ]
      },
      include: {
        stocks: true
      }
    });

    console.log(`Found ${products.length} products for color ${color}:`);
    products.forEach(p => {
      const totalQty = p.stocks.reduce((sum, s) => sum + s.quantity, 0);
      console.log(`  - ID: ${p.id} | SKU: ${p.sku} | Name: "${p.name}" | Stock Qty: ${totalQty}`);
    });

    if (products.length <= 1) {
      console.log(`⚠️ 1 or 0 products found for ${color}, skipping merge.`);
      continue;
    }

    // Standardized target name without 56": e.g. "Bajaj Ceiling Fan (Black)"
    const targetName = `Bajaj Ceiling Fan (${color})`;
    
    // Choose primary product (prefer one whose name is already targetName, or the first one)
    let primary = products.find(p => p.name.trim() === targetName) || products[0];
    const duplicates = products.filter(p => p.id !== primary.id);

    console.log(`🎯 Primary Product chosen: "${primary.name}" (ID: ${primary.id}, SKU: ${primary.sku})`);

    // Ensure primary product name is standardized to "Bajaj Ceiling Fan (Color)"
    if (primary.name !== targetName) {
      await prisma.product.update({
        where: { id: primary.id },
        data: { name: targetName }
      });
      console.log(`  ✏️ Renamed primary product to "${targetName}"`);
    }

    // Merge stock and sales from duplicates to primary
    for (const dup of duplicates) {
      console.log(`  🔄 Merging duplicate ID: ${dup.id} ("${dup.name}")...`);

      for (const dupStock of dup.stocks) {
        if (dupStock.quantity <= 0 && dupStock.availableQuantity <= 0) {
          // Delete zero stock
          await prisma.stock.delete({ where: { id: dupStock.id } });
          continue;
        }

        // Check if primary has stock in the same warehouse
        const primaryStock = await prisma.stock.findFirst({
          where: {
            tenantId: shop.id,
            productId: primary.id,
            warehouseId: dupStock.warehouseId
          }
        });

        if (primaryStock) {
          await prisma.stock.update({
            where: { id: primaryStock.id },
            data: {
              quantity: { increment: dupStock.quantity },
              availableQuantity: { increment: dupStock.availableQuantity },
              reservedQuantity: { increment: dupStock.reservedQuantity },
              damagedQuantity: { increment: dupStock.damagedQuantity },
            }
          });
          console.log(`    ➕ Added ${dupStock.quantity} stock to primary stock record ID: ${primaryStock.id}`);
          await prisma.stock.delete({ where: { id: dupStock.id } });
        } else {
          // Re-assign stock to primary product
          await prisma.stock.update({
            where: { id: dupStock.id },
            data: { productId: primary.id }
          });
          console.log(`    ↗️ Reassigned stock record ID: ${dupStock.id} to primary product`);
        }
      }

      // Re-assign sale items if any exist
      try {
        await prisma.saleItem.updateMany({
          where: { productId: dup.id },
          data: { productId: primary.id }
        });
      } catch (e) {}

      // Delete duplicate product
      await prisma.product.delete({ where: { id: dup.id } });
      console.log(`  🗑️ Deleted duplicate product ID: ${dup.id}`);
    }

    // Print final quantity of primary product
    const updatedPrimaryStocks = await prisma.stock.findMany({ where: { productId: primary.id } });
    const finalQty = updatedPrimaryStocks.reduce((sum, s) => sum + s.quantity, 0);
    console.log(`✨ Final combined product: "${targetName}" | Combined Stock Qty: ${finalQty}`);
  }

  console.log('\n🎉 ALL BAJAJ CEILING FANS COMBINED SUCCESSFULLY!');
}

combineBajajFans()
  .catch(e => {
    console.error('❌ Error:', e.message);
    process.exit(1);
  })
  .finally(() => {
    prisma.$disconnect();
    if (pool) pool.end();
  });
