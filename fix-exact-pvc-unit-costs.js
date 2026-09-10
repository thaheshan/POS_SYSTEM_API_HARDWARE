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

async function fixExactPvcUnitCosts() {
  const shops = await prisma.shop.findMany();
  let shop = shops.find(s => s.id.toLowerCase().includes('3924fc6c'));
  if (!shop && shops.length > 0) shop = shops[0];
  if (!shop) throw new Error('No shop found in database!');

  console.log(`Updating precise wholesale Unit Costs for baseline PVC items in Shop ${shop.id}...`);

  const products = await prisma.product.findMany({
    where: { tenantId: shop.id },
    orderBy: { createdAt: 'asc' },
  });

  let updatedCount = 0;

  for (const prod of products) {
    const skuNum = prod.sku ? parseInt(prod.sku.replace('SKU_', ''), 10) : 0;
    
    // Only target baseline products (SKU_001 to SKU_075) that had generic Rs. 100 costs
    if (skuNum >= 1 && skuNum <= 75) {
      const name = prod.name.toLowerCase();
      let cost = Number(prod.purchasePrice || 0);
      let price = Number(prod.sellingPrice || 0);

      // Determine size-based realistic wholesale cost & retail selling price
      if (name.includes('63mm') || name.includes('63 *') || name.includes('63 mm') || name.includes('63*')) {
        cost = 110;
        price = 180;
      } else if (name.includes('50mm') || name.includes('50 *') || name.includes('50 mm') || name.includes('50*')) {
        cost = 75;
        price = 120;
      } else if (name.includes('40mm') || name.includes('40 *') || name.includes('40 mm') || name.includes('40*')) {
        cost = 50;
        price = 85;
      } else if (name.includes('32mm') || name.includes('32 *') || name.includes('32 mm') || name.includes('32*')) {
        cost = 40;
        price = 65;
      } else if (name.includes('25mm') || name.includes('25 *') || name.includes('25 mm') || name.includes('25*')) {
        cost = 30;
        price = 50;
      } else if (name.includes('20mm') || name.includes('20 *') || name.includes('20 mm') || name.includes('20*')) {
        cost = 20;
        price = 35;
      } else if (name.includes('110mm') || name.includes('110 mm') || name.includes('4 inch') || name.includes('4"')) {
        cost = 280;
        price = 450;
      } else if (name.includes('cap')) {
        cost = 15;
        price = 25;
      }

      await prisma.product.update({
        where: { id: prod.id },
        data: {
          purchasePrice: cost,
          sellingPrice: price,
        },
      });

      updatedCount++;
      console.log(`✅ Updated ${prod.sku} - "${prod.name}": Unit Cost = Rs. ${cost}, Selling Price = Rs. ${price}`);
    }
  }

  console.log(`\n🎉 SUCCESSFULLY UPDATED ACCURATE UNIT COSTS FOR ALL ${updatedCount} BASELINE PVC ITEMS!`);
}

fixExactPvcUnitCosts()
  .catch(console.error)
  .finally(() => {
    prisma.$disconnect();
    if (pool) pool.end();
  });
