require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const { Pool } = require('pg');

let prisma;
try {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: false,
  });
  prisma = new PrismaClient({ adapter: new PrismaPg(pool) });
} catch (e) {
  prisma = new PrismaClient();
}

async function fixIvory() {
  console.log("🔍 Checking Bajaj Ceiling Fan (Ivory) stock details...");

  const products = await prisma.product.findMany({
    where: {
      name: { contains: 'Bajaj', mode: 'insensitive' },
      AND: [
        { name: { contains: 'Fan', mode: 'insensitive' } },
        { name: { contains: 'Ivory', mode: 'insensitive' } }
      ]
    },
    include: { stocks: true }
  });

  console.log(`Found ${products.length} product(s) matching Bajaj Ceiling Fan Ivory:`);
  products.forEach(p => {
    const total = p.stocks.reduce((acc, s) => acc + s.quantity, 0);
    console.log(`Product ID: ${p.id} | SKU: ${p.sku} | Name: "${p.name}" | Stock Records Count: ${p.stocks.length} | Total Stock: ${total}`);
    p.stocks.forEach(s => {
      console.log(`   -> Stock ID: ${s.id} | Qty: ${s.quantity} | Available: ${s.availableQuantity} | Warehouse: ${s.warehouseId}`);
    });
  });

  // Target single primary Ivory product (SKU_357 or similar)
  const targetProduct = products.find(p => p.sku === 'SKU_357') || products[0];

  if (targetProduct) {
    console.log(`\n🎯 Resetting stock for target Ivory fan (ID: ${targetProduct.id}, SKU: ${targetProduct.sku})...`);
    
    // Set target stock quantity to exact 27 (18 from Batch 3 + 8 from Batch 5 + 1 original)
    if (targetProduct.stocks.length > 0) {
      const mainStock = targetProduct.stocks[0];
      await prisma.stock.update({
        where: { id: mainStock.id },
        data: {
          quantity: 27,
          availableQuantity: 27,
        }
      });
      
      // Delete any leftover duplicate stock records for this product
      for (let i = 1; i < targetProduct.stocks.length; i++) {
        await prisma.stock.delete({ where: { id: targetProduct.stocks[i].id } });
      }
    }
    
    console.log(`✅ Successfully updated "${targetProduct.name}" (${targetProduct.sku}) stock to 27.`);
  }
}

fixIvory()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
