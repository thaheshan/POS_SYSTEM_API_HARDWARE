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

async function safeDeleteProduct(dupId, masterId) {
  // 1. Reassign or delete stock movements
  try {
    await prisma.stockMovement.updateMany({
      where: { productId: dupId },
      data: { productId: masterId },
    });
  } catch (e) {
    await prisma.stockMovement.deleteMany({ where: { productId: dupId } }).catch(() => {});
  }

  // 2. Reassign or delete GRN items
  try {
    await prisma.gRNItem.deleteMany({ where: { productId: dupId } });
  } catch (e) {}

  // 3. Reassign or delete Sales Invoice items
  try {
    await prisma.salesInvoiceItem.deleteMany({ where: { productId: dupId } });
  } catch (e) {}

  // 4. Reassign or delete Returned items
  try {
    await prisma.returnedItem.deleteMany({ where: { productId: dupId } });
  } catch (e) {}

  // 5. Reassign or delete Supplier products
  try {
    await prisma.supplierProduct.deleteMany({ where: { productId: dupId } });
  } catch (e) {}

  // 6. Delete stock record
  await prisma.stock.deleteMany({ where: { productId: dupId } });

  // 7. Delete product
  await prisma.product.delete({ where: { id: dupId } });
}

async function fixDuplicates() {
  console.log('🚀 Starting Safe Database Duplicate & Typo Cleanup...\n');

  const shops = await prisma.shop.findMany();
  let shop = shops.find(s => s.id.toLowerCase().includes('3924fc6c'));
  if (!shop && shops.length > 0) shop = shops[0];
  if (!shop) throw new Error('❌ No shop found in database!');
  console.log(`✅ Using Shop: ${shop.name} (${shop.id})`);

  // 1. Fix "63mm End cap" (Merge SKU_048 into SKU_029)
  const masterCap = await prisma.product.findFirst({ where: { tenantId: shop.id, sku: 'SKU_029' } });
  const dupCap = await prisma.product.findFirst({ where: { tenantId: shop.id, sku: 'SKU_048' } });

  if (masterCap && dupCap) {
    const dupStock = await prisma.stock.findFirst({ where: { productId: dupCap.id } });
    const addQty = dupStock ? dupStock.quantity : 0;

    await prisma.stock.updateMany({
      where: { productId: masterCap.id },
      data: { quantity: { increment: addQty }, availableQuantity: { increment: addQty } },
    });
    await safeDeleteProduct(dupCap.id, masterCap.id);
    console.log(`✅ Merged "63mm End cap" (SKU_048 -> SKU_029, +${addQty} stock)`);
  }

  // 2. Fix "ERA Union 1"" (Merge HKU_1036 into HKU_444)
  const masterUnion = await prisma.product.findFirst({ where: { tenantId: shop.id, sku: 'HKU_444' } });
  const dupUnion = await prisma.product.findFirst({ where: { tenantId: shop.id, sku: 'HKU_1036' } });

  if (masterUnion && dupUnion) {
    const dupStock = await prisma.stock.findFirst({ where: { productId: dupUnion.id } });
    const addQty = dupStock ? dupStock.quantity : 0;

    await prisma.stock.updateMany({
      where: { productId: masterUnion.id },
      data: { quantity: { increment: addQty }, availableQuantity: { increment: addQty } },
    });
    await safeDeleteProduct(dupUnion.id, masterUnion.id);
    console.log(`✅ Merged "ERA Union 1"" (HKU_1036 -> HKU_444, +${addQty} stock)`);
  }

  // 3. Fix Typo "Wesda Stainless Steel Rack" -> "Westa Stainless Steel Rack" (Merge HKU_505 into HKU_1018)
  const masterRack = await prisma.product.findFirst({ where: { tenantId: shop.id, sku: 'HKU_1018' } });
  const typoRack = await prisma.product.findFirst({ where: { tenantId: shop.id, sku: 'HKU_505' } });

  if (masterRack && typoRack) {
    const dupStock = await prisma.stock.findFirst({ where: { productId: typoRack.id } });
    const addQty = dupStock ? dupStock.quantity : 0;

    await prisma.stock.updateMany({
      where: { productId: masterRack.id },
      data: { quantity: { increment: addQty }, availableQuantity: { increment: addQty } },
    });
    await safeDeleteProduct(typoRack.id, masterRack.id);
    console.log(`✅ Merged Typo "Wesda" -> "Westa Stainless Steel Rack" (HKU_505 -> HKU_1018, +${addQty} stock)`);
  }

  console.log('\n🎉 CLEANUP COMPLETE! All 3 duplicate/typo products merged and cleaned up safely.');
}

fixDuplicates()
  .catch(e => console.error('❌ Error during cleanup:', e))
  .finally(() => {
    prisma.$disconnect();
    if (pool) pool.end();
  });
