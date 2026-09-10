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

// ─────────────────────────────────────────────────────────────────────────────
// BATCH 16 — HKU Series (Auto-continues from last HKU number in DB)
// Source: 5 handwritten audit sheets — Orange/Alpha Isolators, Switches, Plugs,
//         Cables, Gully Covers, Circuit Breakers, Bathroom Accessories with Secret Codes
// ─────────────────────────────────────────────────────────────────────────────
const productsToInsert = [

  // ─── 1. ISOLATORS & SWITCHES — ORANGE & ALPHA (Sheet 1) ────────────────────
  { name: 'Orange Sigma Isolator 2-Pole 40A',                qty: 16,  category: 'Electronics', subcategory: 'Circuit Breakers', brand: 'Orange',     price: 2400,  unit: 'pcs' },
  { name: 'Orange Sigma Isolator 1-Pole 16A',                qty: 32,  category: 'Electronics', subcategory: 'Circuit Breakers', brand: 'Orange',     price: 1450,  unit: 'pcs' },
  { name: 'Orange Sigma Isolator 1-Pole 10A',                qty: 32,  category: 'Electronics', subcategory: 'Circuit Breakers', brand: 'Orange',     price: 1450,  unit: 'pcs' },
  { name: 'Alpha Isolator 2-Pole 40A',                       qty: 8,   category: 'Electronics', subcategory: 'Circuit Breakers', brand: 'Alpha',      price: 2200,  unit: 'pcs' },
  { name: 'Alpha Isolator 1-Pole 16A',                       qty: 32,  category: 'Electronics', subcategory: 'Circuit Breakers', brand: 'Alpha',      price: 1350,  unit: 'pcs' },
  { name: 'Alpha Isolator 1-Pole 10A',                       qty: 48,  category: 'Electronics', subcategory: 'Circuit Breakers', brand: 'Alpha',      price: 1350,  unit: 'pcs' },
  { name: 'CA 10A 1-Way 1-Gang Switch',                      qty: 20,  category: 'Electronics', subcategory: 'Switches',         brand: 'Generic',    price: 380,   unit: 'pcs' },
  { name: 'CA 10A 1-Way 2-Gang Switch',                      qty: 40,  category: 'Electronics', subcategory: 'Switches',         brand: 'Generic',    price: 520,   unit: 'pcs' },
  { name: 'CA 10A 1-Way 3-Gang Switch',                      qty: 10,  category: 'Electronics', subcategory: 'Switches',         brand: 'Generic',    price: 750,   unit: 'pcs' },
  { name: 'CA 10A 1-Way 4-Gang Switch',                      qty: 20,  category: 'Electronics', subcategory: 'Switches',         brand: 'Generic',    price: 980,   unit: 'pcs' },
  { name: 'CA 10A 1-Way 5-Gang Switch',                      qty: 20,  category: 'Electronics', subcategory: 'Switches',         brand: 'Generic',    price: 1250,  unit: 'pcs' },
  { name: 'XS 13A Plug Top',                                 qty: 40,  category: 'Electronics', subcategory: 'Sockets & Plugs', brand: 'Generic',    price: 280,   unit: 'pcs' },
  { name: 'CA 13A Single Socket Outlet Casablanca',          qty: 84,  category: 'Electronics', subcategory: 'Sockets & Plugs', brand: 'Generic',    price: 850,   unit: 'pcs' },
  { name: 'Dash Tile Cleaner 500ml',                         qty: 11,  category: 'Hardware',  subcategory: 'Cleaners & Chemicals', brand: 'Dash',     price: 680,   unit: '500ml' },
  { name: 'Nine Star Copper Antique Brown Tower Bolt 4"',    qty: 3,   category: 'Hardware',  subcategory: 'Door Fittings',     brand: 'Nine Star',  price: 450,   unit: 'pcs' },
  { name: 'Nine Star Copper Antique Brown Tower Bolt 8"',    qty: 1,   category: 'Hardware',  subcategory: 'Door Fittings',     brand: 'Nine Star',  price: 780,   unit: 'pcs' },
  { name: 'Nine Star Copper Antique Brown Tower Bolt 10"',   qty: 2,   category: 'Hardware',  subcategory: 'Door Fittings',     brand: 'Nine Star',  price: 950,   unit: 'pcs' },
  { name: 'Steel Soap Holder Large',                         qty: 8,   category: 'Hardware',  subcategory: 'Bathroom Accessories', brand: 'Generic', price: 850,   unit: 'pcs' },
  { name: 'Steel Soap Holder Small',                         qty: 5,   category: 'Hardware',  subcategory: 'Bathroom Accessories', brand: 'Generic', price: 650,   unit: 'pcs' },

  // ─── 2. CABLES, MOTORS & ENCLOSURES (Sheet 2) ─────────────────────────────
  { name: 'Polo Gully Cover',                                qty: 60,  category: 'Plumbing',  subcategory: 'Drainage',          brand: 'Polo',       price: 1250,  unit: 'pcs' },
  { name: 'Orange Electric D.O.L. Starter',                  qty: 2,   category: 'Electronics', subcategory: 'Motor Starters',    brand: 'Orange Electric', price: 14500, unit: 'pcs' },
  { name: 'Axtec 4-Way ABC Waterproof Box',                  qty: 13,  category: 'Electronics', subcategory: 'Enclosures',        brand: 'Axtec',      price: 2400,  unit: 'pcs' },
  { name: 'Selhot 4-Way ABC Waterproof Box',                 qty: 1,   category: 'Electronics', subcategory: 'Enclosures',        brand: 'Selhot',     price: 2400,  unit: 'pcs' },
  { name: 'WESDA Soap Holder',                               qty: 4,   category: 'Hardware',  subcategory: 'Bathroom Accessories', brand: 'WESDA',    price: 950,   unit: 'pcs' },
  { name: 'Door Slider Wheel 16"',                           qty: 7,   category: 'Hardware',  subcategory: 'Door Fittings',     brand: 'Generic',    price: 1850,  unit: 'pcs' },
  { name: 'Door Handle 320mm',                               qty: 6,   category: 'Hardware',  subcategory: 'Door Handles',      brand: 'Generic',    price: 3200,  unit: 'pcs' },
  { name: 'Door Handle 450mm',                               qty: 7,   category: 'Hardware',  subcategory: 'Door Handles',      brand: 'Generic',    price: 4500,  unit: 'pcs' },
  { name: 'Air Break Star Delta Motor Starter (Manual)',     qty: 1,   category: 'Electronics', subcategory: 'Motor Starters',    brand: 'Generic',    price: 28500, unit: 'pcs' },
  { name: 'Kelani Cable 1.0mm2 Blue 100m Roll',             qty: 16,  category: 'Electronics', subcategory: 'Cables & Wires',    brand: 'Kelani',     price: 12500, unit: 'roll' },
  { name: 'Kelani Cable 1.0mm2 Brown 100m Roll',            qty: 8,   category: 'Electronics', subcategory: 'Cables & Wires',    brand: 'Kelani',     price: 12500, unit: 'roll' },
  { name: 'Kelani Cable 2.50mm2 100m Roll',                 qty: 3,   category: 'Electronics', subcategory: 'Cables & Wires',    brand: 'Kelani',     price: 24500, unit: 'roll' },
  { name: 'Coaxial Cable 100 Yard Black Roll',               qty: 3,   category: 'Electronics', subcategory: 'Cables & Wires',    brand: 'Generic',    price: 8500,  unit: 'roll' },

  // ─── 3. HINGES, DRAINAGE & CIRCUIT BREAKERS (Sheet 3) ──────────────────────
  { name: 'Oxford Casement Stay 1.6mm x 10"',                 qty: 24,  category: 'Hardware',  subcategory: 'Door Fittings',     brand: 'Oxford',     price: 350,   unit: 'pcs' },
  { name: 'Oxford Butt Hinges 4" x 4"',                      qty: 24,  category: 'Hardware',  subcategory: 'Door Fittings',     brand: 'Oxford',     price: 380,   unit: 'pcs' },
  { name: 'Oxford Black Tower Bolt 3"',                      qty: 12,  category: 'Hardware',  subcategory: 'Door Fittings',     brand: 'Oxford',     price: 220,   unit: 'pcs' },
  { name: 'Oxford Butt Hinges 4" x 2"',                      qty: 60,  category: 'Hardware',  subcategory: 'Door Fittings',     brand: 'Oxford',     price: 220,   unit: 'pcs' },
  { name: 'Oxford Butt Hinges 2" x 2"',                      qty: 264, category: 'Hardware',  subcategory: 'Door Fittings',     brand: 'Oxford',     price: 150,   unit: 'pcs' },
  { name: 'Oxford Butt Hinges 3" x 3"',                      qty: 1,   category: 'Hardware',  subcategory: 'Door Fittings',     brand: 'Oxford',     price: 280,   unit: 'pcs' },
  { name: 'Shelf Bracket 5" x 6"',                           qty: 36,  category: 'Hardware',  subcategory: 'Brackets & Supports', brand: 'Generic',   price: 240,   unit: 'pcs' },
  { name: 'Shelf Bracket 8" x 10"',                          qty: 36,  category: 'Hardware',  subcategory: 'Brackets & Supports', brand: 'Generic',   price: 480,   unit: 'pcs' },
  { name: 'Waste Cuplin 1 1/4"',                             qty: 10,  category: 'Plumbing',  subcategory: 'Sanitaryware',        brand: 'Generic',    price: 650,   unit: 'pcs' },
  { name: 'Galaxy Plastic Pop-Up Basin Waste',               qty: 2,   category: 'Plumbing',  subcategory: 'Sanitaryware',        brand: 'Galaxy',     price: 1250,  unit: 'pcs' },
  { name: 'King Mega Plastic Pop-Up Basin Waste',            qty: 8,   category: 'Plumbing',  subcategory: 'Sanitaryware',        brand: 'King Mega',  price: 1350,  unit: 'pcs' },
  { name: 'Fordmix Plastic Pop-Up Basin Waste',              qty: 3,   category: 'Plumbing',  subcategory: 'Sanitaryware',        brand: 'Fordmix',    price: 1450,  unit: 'pcs' },
  { name: 'HAZI Waste Cuplin',                               qty: 5,   category: 'Plumbing',  subcategory: 'Sanitaryware',        brand: 'HAZI',       price: 850,   unit: 'pcs' },
  { name: 'Rhodes Basin Waste',                              qty: 7,   category: 'Plumbing',  subcategory: 'Sanitaryware',        brand: 'Rhodes',     price: 1150,  unit: 'pcs' },
  { name: 'Bestford Stop Valve 1/2"',                        qty: 10,  category: 'Plumbing',  subcategory: 'Valves',              brand: 'Bestford',   price: 1450,  unit: 'pcs' },
  { name: 'Indoasian 2-Pole Isolator',                       qty: 2,   category: 'Electronics', subcategory: 'Circuit Breakers', brand: 'Indoasian',  price: 2200,  unit: 'pcs' },
  { name: 'Indoasian Miniature Circuit Breaker (MCB)',       qty: 3,   category: 'Electronics', subcategory: 'Circuit Breakers', brand: 'Indoasian',  price: 950,   unit: 'pcs' },
  { name: 'Stavro 2-Pole Isolator',                          qty: 4,   category: 'Electronics', subcategory: 'Circuit Breakers', brand: 'Stavro',     price: 2400,  unit: 'pcs' },
  { name: 'Stavro 4-Pole MCCB (LMC-40100)',                  qty: 1,   category: 'Electronics', subcategory: 'Circuit Breakers', brand: 'Stavro',     price: 18500, unit: 'pcs' },
  { name: 'Fulmen RCCB Interruptor Diferencial 230V AC',    qty: 8,   category: 'Electronics', subcategory: 'Circuit Breakers', brand: 'Fulmen',     price: 4800,  unit: 'pcs' },
  { name: 'Schneider Miniature Circuit Breaker (MCB)',       qty: 14,  category: 'Electronics', subcategory: 'Circuit Breakers', brand: 'Schneider',  price: 1250,  unit: 'pcs' },

  // ─── 4. BATHROOM ACCESSORIES WITH SECRET CODES (Sheet 4) ───────────────────
  { name: 'Acitka Bathroom Accessories Set',                 qty: 4,   category: 'Hardware',  subcategory: 'Bathroom Accessories', brand: 'Acitka',    price: 18500, unit: 'set' },
  { name: 'Liborno Bathroom Accessories Set',                qty: 1,   category: 'Hardware',  subcategory: 'Bathroom Accessories', brand: 'Liborno',   price: 22500, unit: 'set' },
  { name: 'Jalace Towel Rod',                                qty: 2,   category: 'Hardware',  subcategory: 'Bathroom Accessories', brand: 'Jalace',    price: 2800,  unit: 'pcs' },
  { name: 'Galaxy Stainless Steel Towel Bar',                qty: 8,   category: 'Hardware',  subcategory: 'Bathroom Accessories', brand: 'Galaxy',    price: 3400,  unit: 'pcs' },
  { name: 'Westa Towel Bar (BFKK)',                          qty: 1,   category: 'Hardware',  subcategory: 'Bathroom Accessories', brand: 'Westa',     price: 3200,  unit: 'pcs' },
  { name: 'Westa Stainless Steel Rack',                      qty: 1,   category: 'Hardware',  subcategory: 'Bathroom Accessories', brand: 'Westa',     price: 4200,  unit: 'pcs' },
  { name: 'Westa Bathroom Corner Soap Holder (RJKF4)',       qty: 1,   category: 'Hardware',  subcategory: 'Bathroom Accessories', brand: 'Westa',     price: 2400,  unit: 'pcs' },
  { name: 'Rapsel Bathroom Corner Soap Holder (DGKK)',       qty: 1,   category: 'Hardware',  subcategory: 'Bathroom Accessories', brand: 'Rapsel',    price: 2600,  unit: 'pcs' },
  { name: 'Rhodes Bathroom Corner Soap Holder (P332)',       qty: 2,   category: 'Hardware',  subcategory: 'Bathroom Accessories', brand: 'Rhodes',    price: 2200,  unit: 'pcs' },
  { name: 'Westa Towel Hanger (EGKK)',                       qty: 1,   category: 'Hardware',  subcategory: 'Bathroom Accessories', brand: 'Westa',     price: 1850,  unit: 'pcs' },
  { name: 'Soap Basket',                                     qty: 2,   category: 'Hardware',  subcategory: 'Bathroom Accessories', brand: 'Generic',   price: 1250,  unit: 'pcs' },
  { name: 'Rapsel Urinal Flush Valve',                       qty: 3,   category: 'Plumbing',  subcategory: 'Sanitaryware',        brand: 'Rapsel',     price: 4800,  unit: 'pcs' },
  { name: 'Rapsel Head Shower (CERK)',                       qty: 3,   category: 'Plumbing',  subcategory: 'Sanitaryware',        brand: 'Rapsel',     price: 3800,  unit: 'pcs' },
  { name: 'Rapsel Soap Holder (EFKK)',                       qty: 1,   category: 'Hardware',  subcategory: 'Bathroom Accessories', brand: 'Rapsel',    price: 1650,  unit: 'pcs' },
  { name: 'Rapsel Chrome Paper Holder',                      qty: 1,   category: 'Hardware',  subcategory: 'Bathroom Accessories', brand: 'Rapsel',    price: 2200,  unit: 'pcs' },
  { name: 'Rapsel Shower Square (CEKK)',                     qty: 1,   category: 'Plumbing',  subcategory: 'Sanitaryware',        brand: 'Rapsel',     price: 3400,  unit: 'pcs' },
  { name: 'Shower Round',                                    qty: 7,   category: 'Plumbing',  subcategory: 'Sanitaryware',        brand: 'Generic',    price: 2200,  unit: 'pcs' },
  { name: 'Fordmix Sliding Bar Set (PL342)',                 qty: 9,   category: 'Plumbing',  subcategory: 'Sanitaryware',        brand: 'Fordmix',    price: 5800,  unit: 'pcs' },
  { name: 'Watermax Towel Bar (DKKK)',                       qty: 1,   category: 'Hardware',  subcategory: 'Bathroom Accessories', brand: 'Watermax',  price: 2800,  unit: 'pcs' },
  { name: 'Miller Bathroom Hanger (BEFK)',                   qty: 4,   category: 'Hardware',  subcategory: 'Bathroom Accessories', brand: 'Miller',    price: 2100,  unit: 'pcs' },
  { name: 'Orange LED Panel 18W Daylight',                  qty: 13,  category: 'Electronics', subcategory: 'Lighting',           brand: 'Orange',     price: 1950,  unit: 'pcs' },
];

async function insertProductsBatch16() {
  console.log('🚀 Starting Batch 16 Product Insertion & Smart Stock Upsert...\n');

  const shops = await prisma.shop.findMany();
  let shop = shops.find(s => s.id.toLowerCase().includes('3924fc6c'));
  if (!shop && shops.length > 0) shop = shops[0];
  if (!shop) throw new Error('❌ No shop found in database!');
  console.log(`✅ Using Shop: ${shop.name} (${shop.id})`);

  const warehouses = await prisma.warehouse.findMany({ where: { tenantId: shop.id } });
  const warehouse = warehouses[0] || (await prisma.warehouse.findFirst());
  if (!warehouse) throw new Error('❌ No warehouse found in database!');

  const branches = await prisma.branch.findMany({ where: { tenantId: shop.id } });
  const branchId = warehouse.branchId || (branches[0] ? branches[0].id : shop.id);
  console.log(`✅ Using Warehouse: ${warehouse.name} (${warehouse.id})`);

  const allExisting = await prisma.product.findMany({
    where: { tenantId: shop.id },
    select: { id: true, name: true, sku: true },
  });

  const existingByName = new Map();
  let maxHkuNum = 0;
  allExisting.forEach(p => {
    existingByName.set(p.name.toLowerCase(), p);
    const hkuMatch = p.sku && p.sku.match(/HKU_(\d+)/i);
    if (hkuMatch) {
      const num = parseInt(hkuMatch[1], 10);
      if (num > maxHkuNum) maxHkuNum = num;
    }
  });

  let hkuIndex = maxHkuNum + 1;
  console.log(`📦 HKU sequence continuing from: HKU_${String(hkuIndex).padStart(2, '0')}`);

  const catCache = new Map();
  const subCatCache = new Map();
  const brandCache = new Map();

  const existingCats = await prisma.category.findMany({ where: { tenantId: shop.id } });
  existingCats.forEach(c => catCache.set(c.name.toLowerCase(), c));

  const existingBrands = await prisma.brand.findMany({ where: { tenantId: shop.id } });
  existingBrands.forEach(b => brandCache.set(b.name.toLowerCase(), b));

  let insertedCount = 0;
  let updatedCount = 0;

  for (const item of productsToInsert) {
    const existingProd = existingByName.get(item.name.toLowerCase());

    if (existingProd) {
      const stock = await prisma.stock.findFirst({
        where: { tenantId: shop.id, productId: existingProd.id, warehouseId: warehouse.id },
      });
      if (stock) {
        await prisma.stock.update({
          where: { id: stock.id },
          data: { quantity: { increment: item.qty }, availableQuantity: { increment: item.qty } },
        });
      } else {
        await prisma.stock.create({
          data: { tenantId: shop.id, productId: existingProd.id, warehouseId: warehouse.id, branchId, quantity: item.qty, availableQuantity: item.qty },
        });
      }
      updatedCount++;
      console.log(`[STOCK+] ${existingProd.sku.padEnd(8)} | +${String(item.qty).padStart(3)} | ${item.name}`);
    } else {
      let cat = catCache.get(item.category.toLowerCase());
      if (!cat) {
        cat = await prisma.category.create({ data: { tenantId: shop.id, name: item.category } });
        catCache.set(item.category.toLowerCase(), cat);
      }

      const subKey = `${item.category}:${item.subcategory}`.toLowerCase();
      let subCat = subCatCache.get(subKey);
      if (!subCat) {
        const existingSub = existingCats.find(c => c.name.toLowerCase() === item.subcategory.toLowerCase() && c.parentId === cat.id);
        subCat = existingSub || await prisma.category.create({ data: { tenantId: shop.id, name: item.subcategory, parentId: cat.id } });
        subCatCache.set(subKey, subCat);
      }

      let brand = null;
      if (item.brand && item.brand !== 'Generic') {
        brand = brandCache.get(item.brand.toLowerCase());
        if (!brand) {
          brand = await prisma.brand.create({ data: { tenantId: shop.id, name: item.brand, categoryId: cat.id } });
          brandCache.set(item.brand.toLowerCase(), brand);
        }
      }

      const hkuCode = `HKU_${String(hkuIndex).padStart(2, '0')}`;
      const barcode  = `30000${String(hkuIndex).padStart(5, '0')}`;
      hkuIndex++;

      const purchasePrice = Math.round(item.price * 0.72);

      const product = await prisma.product.create({
        data: {
          tenantId: shop.id, name: item.name, sku: hkuCode, barcode,
          categoryId: cat.id, subcategoryId: subCat?.id || null, brandId: brand?.id || null,
          sellingPrice: item.price, purchasePrice,
          minimumStockLevel: 3, sellType: 'FIX', measurementUnit: item.unit || 'pcs',
        },
      });

      await prisma.stock.create({
        data: {
          tenantId: shop.id, productId: product.id, warehouseId: warehouse.id,
          branchId, quantity: item.qty, availableQuantity: item.qty, reservedQuantity: 0, damagedQuantity: 0,
        },
      });

      insertedCount++;
      console.log(`[NEW]    ${hkuCode.padEnd(8)} | Qty:${String(item.qty).padStart(3)} | Rs.${String(item.price).padStart(6)} | ${item.name}`);
    }
  }

  console.log(`\n🎉 BATCH 16 COMPLETE!`);
  console.log(`   ✅ New Products Inserted : ${insertedCount}`);
  console.log(`   🔄 Existing Stock Updated: ${updatedCount}`);
  console.log(`   📋 HKU series now at     : HKU_${String(hkuIndex - 1).padStart(2, '0')}`);
}

insertProductsBatch16()
  .catch(e => { console.error('❌ Error:', e.message); process.exit(1); })
  .finally(() => { prisma.$disconnect(); if (pool) pool.end(); });
