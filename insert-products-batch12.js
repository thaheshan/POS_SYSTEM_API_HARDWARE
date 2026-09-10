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
// BATCH 12 — HKU Series (Auto-continues from last HKU number in DB)
// Source: 5 handwritten sheets — Tapes, Fillers, Fan, LGTL Lights,
//         Nails/Screws, Wall Plugs, PVC Fittings
// ─────────────────────────────────────────────────────────────────────────────
const productsToInsert = [

  // ─── 1. FILLERS & PAINT ───────────────────────────────────────────────────
  { name: 'Nippon Paint Wall Filler 20L',                    qty: 2,   category: 'Paints',    subcategory: 'Fillers & Putty',       brand: 'Nippon',      price: 6500,  unit: '20L' },

  // ─── 2. TAPES ────────────────────────────────────────────────────────────
  { name: 'Highflex Masking Tape 1" (Small Roll)',           qty: 124, category: 'Hardware',  subcategory: 'Tapes',                 brand: 'Highflex',    price: 120,   unit: 'roll' },
  { name: 'Highflex Masking Tape 1" 24m Yellow',             qty: 75,  category: 'Hardware',  subcategory: 'Tapes',                 brand: 'Highflex',    price: 185,   unit: 'roll' },
  { name: 'Highflex Masking Tape 2" 50mm Yellow',            qty: 12,  category: 'Hardware',  subcategory: 'Tapes',                 brand: 'Highflex',    price: 320,   unit: 'roll' },
  { name: 'Highflex Masking Tape 8" 48mm Yellow',            qty: 16,  category: 'Hardware',  subcategory: 'Tapes',                 brand: 'Highflex',    price: 580,   unit: 'roll' },
  { name: 'Hifoam Masking Tape 1" 48mm',                     qty: 14,  category: 'Hardware',  subcategory: 'Tapes',                 brand: 'Hifoam',      price: 180,   unit: 'roll' },
  { name: 'Gecko Masking Tape 9"',                           qty: 3,   category: 'Hardware',  subcategory: 'Tapes',                 brand: 'Gecko',       price: 950,   unit: 'roll' },
  { name: 'Sharkgrip Fibreglass Tape 50mm x 90m',            qty: 2,   category: 'Hardware',  subcategory: 'Tapes',                 brand: 'Sharkgrip',   price: 2800,  unit: 'roll' },
  { name: 'UBora Self Adhesive Fibreglass Tape 50mm x 4m',   qty: 2,   category: 'Hardware',  subcategory: 'Tapes',                 brand: 'UBora',       price: 950,   unit: 'roll' },
  { name: 'Yorgtown Fibreglass Tape 2"',                     qty: 4,   category: 'Hardware',  subcategory: 'Tapes',                 brand: 'Yorgtown',    price: 380,   unit: 'roll' },
  { name: 'Highflex Cloth Tape 2"',                          qty: 1,   category: 'Hardware',  subcategory: 'Tapes',                 brand: 'Highflex',    price: 450,   unit: 'roll' },
  { name: 'Mandrust Cloth Tape 2" Ash',                      qty: 7,   category: 'Hardware',  subcategory: 'Tapes',                 brand: 'Mandrust',    price: 420,   unit: 'roll' },
  { name: 'Highflex PVC Connector Tape 50mm x 8m',           qty: 3,   category: 'Hardware',  subcategory: 'Tapes',                 brand: 'Highflex',    price: 680,   unit: 'roll' },
  { name: 'Sharkgrip Butyl Waterproof Tape 2"',              qty: 6,   category: 'Hardware',  subcategory: 'Tapes',                 brand: 'Sharkgrip',   price: 1850,  unit: 'roll' },

  // ─── 3. ADHESIVES / RESIN ─────────────────────────────────────────────────
  { name: 'Axfix Epoxy Adhesive 400g',                       qty: 8,   category: 'Hardware',  subcategory: 'Adhesives & Solvents',  brand: 'Axfix',       price: 980,   unit: '400g' },
  { name: 'Axfix Epoxy Adhesive 1kg',                        qty: 9,   category: 'Hardware',  subcategory: 'Adhesives & Solvents',  brand: 'Axfix',       price: 2100,  unit: '1kg' },
  { name: 'Nippon Print Two-Component Epoxy Adhesive 500g',  qty: 1,   category: 'Hardware',  subcategory: 'Adhesives & Solvents',  brand: 'Nippon',      price: 1450,  unit: '500g' },

  // ─── 4. FANS & LGTL LIGHTING (with cost prices as purchase price) ─────────
  { name: 'PAL WattBall Fan',                                qty: 2,   category: 'Electronics', subcategory: 'Fans',               brand: 'PAL',         price: 54000, unit: 'pcs', purchasePrice: 39000 },
  { name: 'LGTL 12W Surface Light Round',                    qty: 40,  category: 'Electronics', subcategory: 'Lighting',           brand: 'LGTL',        price: 1750,  unit: 'pcs', purchasePrice: 1250 },
  { name: 'LGTL 30W Flood Light 6500K',                      qty: 20,  category: 'Electronics', subcategory: 'Flood Lights',       brand: 'LGTL',        price: 3100,  unit: 'pcs', purchasePrice: 2250 },
  { name: 'LGTL 20W Flood Light 6500K',                      qty: 20,  category: 'Electronics', subcategory: 'Flood Lights',       brand: 'LGTL',        price: 2300,  unit: 'pcs', purchasePrice: 1650 },
  { name: 'LGTL 10W Flood Light 6500K',                      qty: 20,  category: 'Electronics', subcategory: 'Flood Lights',       brand: 'LGTL',        price: 1400,  unit: 'pcs', purchasePrice: 1000 },

  // ─── 5. NAILS & SCREWS ────────────────────────────────────────────────────
  { name: 'Oxford Masonry Nail 1 1/2" x T 1200pcs',         qty: 3,   category: 'Hardware',  subcategory: 'Fasteners',             brand: 'Oxford',      price: 850,   unit: 'box' },
  { name: 'Oxford Masonry Nail 3/4 x 8 1200pcs',            qty: 2,   category: 'Hardware',  subcategory: 'Fasteners',             brand: 'Oxford',      price: 680,   unit: 'box' },
  { name: 'Oxford Masonry Nail 6 x 5/8 Black 1000pcs',      qty: 5,   category: 'Hardware',  subcategory: 'Fasteners',             brand: 'Oxford',      price: 750,   unit: 'box' },
  { name: 'Oxford Masonry Nail 3 1/4 x 10 Black Brown 1000pcs', qty: 1, category: 'Hardware', subcategory: 'Fasteners',            brand: 'Oxford',      price: 950,   unit: 'box' },
  { name: 'Oxford Masonry Nail 1 1/4 x 7 1000pcs',          qty: 1,   category: 'Hardware',  subcategory: 'Fasteners',             brand: 'Oxford',      price: 780,   unit: 'box' },
  { name: 'Oxford Ring Shank Nail 7 x 1 1/2 Silver 500g',   qty: 2,   category: 'Hardware',  subcategory: 'Fasteners',             brand: 'Oxford',      price: 480,   unit: '500g' },
  { name: 'Oxford Ring Shank Nail 1kg Silver',               qty: 6,   category: 'Hardware',  subcategory: 'Fasteners',             brand: 'Oxford',      price: 880,   unit: '1kg' },
  { name: 'Concrete Nail 2" x 1/4',                         qty: 3,   category: 'Hardware',  subcategory: 'Fasteners',             brand: 'Generic',     price: 380,   unit: 'kg' },
  { name: 'Sarifa Drywall Screw 3/8 x S 1000pcs',           qty: 3,   category: 'Hardware',  subcategory: 'Fasteners',             brand: 'Sarifa',      price: 550,   unit: 'box' },
  { name: 'Sarifa Drywall Screw 6 x 1 1000pcs',             qty: 16,  category: 'Hardware',  subcategory: 'Fasteners',             brand: 'Sarifa',      price: 580,   unit: 'box' },
  { name: 'Sarifa Drywall Screw 3.3 x 2 1000pcs',           qty: 44,  category: 'Hardware',  subcategory: 'Fasteners',             brand: 'Sarifa',      price: 620,   unit: 'box' },
  { name: 'BR Original Drywall Screw 5/8 x S 1000pcs',      qty: 2,   category: 'Hardware',  subcategory: 'Fasteners',             brand: 'BR',          price: 580,   unit: 'box' },
  { name: 'Oxford Twilight Shank Nail 3 1/2 x 2 Silver 500g', qty: 5, category: 'Hardware',  subcategory: 'Fasteners',             brand: 'Oxford',      price: 520,   unit: '500g' },
  { name: 'Power Felt Nail 3/4 x 12 Silver 1kg',            qty: 3,   category: 'Hardware',  subcategory: 'Fasteners',             brand: 'Power',       price: 750,   unit: '1kg' },
  { name: 'Gigattall Concrete Nail 1" 1kg',                  qty: 11,  category: 'Hardware',  subcategory: 'Fasteners',             brand: 'Gigattall',   price: 680,   unit: '1kg' },
  { name: 'Gigattall Concrete Nail 4" 1kg',                  qty: 4,   category: 'Hardware',  subcategory: 'Fasteners',             brand: 'Gigattall',   price: 920,   unit: '1kg' },
  { name: 'Gigattall Concrete Nail 3" 1kg',                  qty: 4,   category: 'Hardware',  subcategory: 'Fasteners',             brand: 'Gigattall',   price: 820,   unit: '1kg' },
  { name: 'Batta Angular Spiral Shank Nail 2 1/2 x 4 500g', qty: 30,  category: 'Hardware',  subcategory: 'Fasteners',             brand: 'Batta',       price: 580,   unit: '500g' },
  { name: 'Batta Twilight Nail 2" 6 x 3.6mm',               qty: 23,  category: 'Hardware',  subcategory: 'Fasteners',             brand: 'Batta',       price: 420,   unit: 'pcs' },
  { name: 'Batta Nail 8 1/2 x 3.235 500g',                  qty: 21,  category: 'Hardware',  subcategory: 'Fasteners',             brand: 'Batta',       price: 680,   unit: '500g' },
  { name: 'Greenlight Concrete Nail 1"',                     qty: 6,   category: 'Hardware',  subcategory: 'Fasteners',             brand: 'Greenlight',  price: 650,   unit: 'kg' },
  { name: 'RNS Concrete Nail 2"',                            qty: 3,   category: 'Hardware',  subcategory: 'Fasteners',             brand: 'RNS',         price: 780,   unit: 'kg' },
  { name: 'Yalida Screw 7 x 1 1/2 Black 500g',              qty: 12,  category: 'Hardware',  subcategory: 'Fasteners',             brand: 'Yalida',      price: 480,   unit: '500g' },
  { name: 'Yalida Screw 7 x 1 1/4 Silver 500g',             qty: 4,   category: 'Hardware',  subcategory: 'Fasteners',             brand: 'Yalida',      price: 450,   unit: '500g' },
  { name: 'Yalida Screw 6 x 1 1/4 Silver 500g',             qty: 3,   category: 'Hardware',  subcategory: 'Fasteners',             brand: 'Yalida',      price: 420,   unit: '500g' },
  { name: 'CJS Drywall Screw 8 x 1.5 Galvanized 500g',      qty: 86,  category: 'Hardware',  subcategory: 'Fasteners',             brand: 'CJS',         price: 520,   unit: '500g' },
  { name: 'CJS Drywall Screw 1 x 10 Black 500g',            qty: 74,  category: 'Hardware',  subcategory: 'Fasteners',             brand: 'CJS',         price: 480,   unit: '500g' },
  { name: 'Strand Nail 1" 1kg',                              qty: 1,   category: 'Hardware',  subcategory: 'Fasteners',             brand: 'Strand',      price: 680,   unit: '1kg' },
  { name: 'Three Stars Nail Shade One Pound 1"',             qty: 6,   category: 'Hardware',  subcategory: 'Fasteners',             brand: 'Three Stars', price: 750,   unit: 'box' },

  // ─── 6. WALL PLUGS & THREAD SCREWS ────────────────────────────────────────
  { name: 'Screw S10 4m Yellow (50pcs)',                     qty: 9,   category: 'Hardware',  subcategory: 'Fasteners',             brand: 'Generic',     price: 380,   unit: 'box' },
  { name: 'Screw S8 40m White (100pcs)',                     qty: 5,   category: 'Hardware',  subcategory: 'Fasteners',             brand: 'Generic',     price: 480,   unit: 'box' },
  { name: 'Screw 25mm 12.0mm Blue',                          qty: 40,  category: 'Hardware',  subcategory: 'Fasteners',             brand: 'Generic',     price: 28,    unit: 'pcs' },
  { name: 'Milhua Wall Plug 5/8 Blue (100pcs)',              qty: 39,  category: 'Hardware',  subcategory: 'Wall Plugs',            brand: 'Milhua',      price: 220,   unit: 'box' },
  { name: 'Milhua Wall Plug 5/6 Blue (100pcs)',              qty: 52,  category: 'Hardware',  subcategory: 'Wall Plugs',            brand: 'Milhua',      price: 220,   unit: 'box' },
  { name: 'Milhua Wall Plug 5/7 Blue (100pcs)',              qty: 19,  category: 'Hardware',  subcategory: 'Wall Plugs',            brand: 'Milhua',      price: 220,   unit: 'box' },
  { name: 'Milhua Wall Plug 5/12 Blue (25pcs)',              qty: 9,   category: 'Hardware',  subcategory: 'Wall Plugs',            brand: 'Milhua',      price: 120,   unit: 'box' },
  { name: 'Milhua Wall Plug 5/10 Blue (50pcs)',              qty: 2,   category: 'Hardware',  subcategory: 'Wall Plugs',            brand: 'Milhua',      price: 160,   unit: 'box' },
  { name: 'Coro Thread Screw 50 x 10mm Yellow',              qty: 3,   category: 'Hardware',  subcategory: 'Fasteners',             brand: 'Coro',        price: 420,   unit: 'box' },
  { name: 'Coro Thread Screw 100 x 7m Yellow',              qty: 3,   category: 'Hardware',  subcategory: 'Fasteners',             brand: 'Coro',        price: 580,   unit: 'box' },
  { name: 'Enterprise SS Thread Screw 100 x 25mm Blue',     qty: 10,  category: 'Hardware',  subcategory: 'Fasteners',             brand: 'Enterprise',  price: 650,   unit: 'box' },

  // ─── 7. PVC FOOT VALVES & FITTINGS ────────────────────────────────────────
  { name: 'ERA Foot Valve Teflon PPM 1" 32mm Grey',          qty: 16,  category: 'Plumbing',  subcategory: 'Valves',                brand: 'ERA',         price: 1650,  unit: 'pcs' },
  { name: 'Yala Foot Valve Red 1 1/2"',                      qty: 2,   category: 'Plumbing',  subcategory: 'Valves',                brand: 'Yala',        price: 1450,  unit: 'pcs' },
  { name: 'Yala Foot Valve Red 1"',                          qty: 7,   category: 'Plumbing',  subcategory: 'Valves',                brand: 'Yala',        price: 1150,  unit: 'pcs' },
  { name: 'Kevin Foot Valve Red 2"',                         qty: 1,   category: 'Plumbing',  subcategory: 'Valves',                brand: 'Kevin',       price: 2200,  unit: 'pcs' },
  { name: 'LED Stop Thread Valve 1"',                        qty: 1,   category: 'Plumbing',  subcategory: 'Valves',                brand: 'LED',         price: 1250,  unit: 'pcs' },
  { name: 'Force Leak Proof Stop Valve 2"',                  qty: 2,   category: 'Plumbing',  subcategory: 'Valves',                brand: 'Force',       price: 3200,  unit: 'pcs' },
  { name: 'Bestfreid Union 2" 63mm',                         qty: 2,   category: 'Plumbing',  subcategory: 'Pipe Fittings',         brand: 'Bestfreid',   price: 1450,  unit: 'pcs' },
  { name: 'S-Lon Foot Valve 1" 32mm',                        qty: 1,   category: 'Plumbing',  subcategory: 'Valves',                brand: 'S-Lon',       price: 1250,  unit: 'pcs' },
  { name: 'Anton WB Faucet Elbow 20mm x 1/2" (16 Box)',      qty: 9,   category: 'Plumbing',  subcategory: 'Pipe Fittings',         brand: 'Anton',       price: 420,   unit: 'pcs' },
];

async function insertProductsBatch12() {
  console.log('🚀 Starting Batch 12 Product Insertion & Smart Stock Upsert...\n');

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

      // Use explicit purchasePrice if provided (for LGTL/PAL with known cost), else estimate at 72%
      const purchasePrice = item.purchasePrice != null ? item.purchasePrice : Math.round(item.price * 0.72);

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

  console.log(`\n🎉 BATCH 12 COMPLETE!`);
  console.log(`   ✅ New Products Inserted : ${insertedCount}`);
  console.log(`   🔄 Existing Stock Updated: ${updatedCount}`);
  console.log(`   📋 HKU series now at     : HKU_${String(hkuIndex - 1).padStart(2, '0')}`);
}

insertProductsBatch12()
  .catch(e => { console.error('❌ Error:', e.message); process.exit(1); })
  .finally(() => { prisma.$disconnect(); if (pool) pool.end(); });
