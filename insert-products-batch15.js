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
// BATCH 15 — HKU Series (Auto-continues from last HKU number in DB)
// Source: 5 handwritten audit sheets — Distribution Boards, Brackets, Lighting,
//         Blind Rivets, Hinges, Screws, Sunk Boxes, Measuring Tapes, Bath Accessories
// ─────────────────────────────────────────────────────────────────────────────
const productsToInsert = [

  // ─── 1. SHELF BRACKETS & KITCHEN FAUCETS (Sheet 1) ─────────────────────────
  { name: 'White Shelf Bracket 6" x 8"',                     qty: 24,  category: 'Hardware',  subcategory: 'Brackets & Supports', brand: 'Generic',    price: 320,   unit: 'pair' },
  { name: 'White Shelf Bracket 5" x 6"',                     qty: 144, category: 'Hardware',  subcategory: 'Brackets & Supports', brand: 'Generic',    price: 240,   unit: 'pair' },
  { name: 'White Shelf Bracket 8" x 10"',                    qty: 12,  category: 'Hardware',  subcategory: 'Brackets & Supports', brand: 'Generic',    price: 480,   unit: 'pair' },
  { name: 'White Shelf Bracket 12" x 14"',                   qty: 48,  category: 'Hardware',  subcategory: 'Brackets & Supports', brand: 'Generic',    price: 750,   unit: 'pair' },
  { name: 'MILA Head Shower 4" x 4"',                        qty: 11,  category: 'Plumbing',  subcategory: 'Sanitaryware',        brand: 'MILA',       price: 1850,  unit: 'pcs' },
  { name: 'Fordmix Pull Out Kitchen Faucet',                 qty: 7,   category: 'Plumbing',  subcategory: 'Sanitaryware',        brand: 'Fordmix',    price: 8500,  unit: 'pcs' },

  // ─── 2. ORANGE ELECTRIC DISTRIBUTION BOARDS (Sheet 1) ──────────────────────
  { name: 'Orange Electric Single Row DB 8-Way',            qty: 2,   category: 'Electronics', subcategory: 'Distribution Boards', brand: 'Orange Electric', price: 2800, unit: 'pcs' },
  { name: 'Orange Electric Single Row DB 18-Way',           qty: 1,   category: 'Electronics', subcategory: 'Distribution Boards', brand: 'Orange Electric', price: 4200, unit: 'pcs' },
  { name: 'Orange Electric Four Pole MCCB Box',             qty: 1,   category: 'Electronics', subcategory: 'Distribution Boards', brand: 'Orange Electric', price: 3800, unit: 'pcs' },
  { name: 'Orange Electric Single Row DB 20-Way',           qty: 5,   category: 'Electronics', subcategory: 'Distribution Boards', brand: 'Orange Electric', price: 4600, unit: 'pcs' },
  { name: 'Orange Electric Three Row DB 54-Way',            qty: 1,   category: 'Electronics', subcategory: 'Distribution Boards', brand: 'Orange Electric', price: 12500, unit: 'pcs' },
  { name: 'Orange Electric Single Row DB 16-Way',           qty: 3,   category: 'Electronics', subcategory: 'Distribution Boards', brand: 'Orange Electric', price: 3900, unit: 'pcs' },

  // ─── 3. LIGHTING PANELS (Sheet 1) ─────────────────────────────────────────
  { name: 'MingLED Recessed LED Panel 12+4W Cool & Warm Square', qty: 6, category: 'Electronics', subcategory: 'Lighting',     brand: 'Ming',       price: 1450,  unit: 'pcs' },
  { name: 'Blue Star Net 5/8" One Pound',                   qty: 25,  category: 'Hardware',  subcategory: 'Fasteners',           brand: 'Blue Star',  price: 680,   unit: 'box' },
  { name: 'Wireman Surface Circular Panel Light 18W',       qty: 2,   category: 'Electronics', subcategory: 'Lighting',           brand: 'Wireman',    price: 1650,  unit: 'pcs' },
  { name: 'R1 LED Panel Light 12W Square',                  qty: 1,   category: 'Electronics', subcategory: 'Lighting',           brand: 'R1',         price: 1250,  unit: 'pcs' },
  { name: 'Wireman LED Panel Circular Light 12W',           qty: 1,   category: 'Electronics', subcategory: 'Lighting',           brand: 'Wireman',    price: 1250,  unit: 'pcs' },
  { name: 'Polycrome Recessed Panel Light 12W',              qty: 3,   category: 'Electronics', subcategory: 'Lighting',           brand: 'Polycrome',  price: 1350,  unit: 'pcs' },
  { name: 'MingLED Surface LED 12+4W Cool & Warm Square',   qty: 14,  category: 'Electronics', subcategory: 'Lighting',           brand: 'Ming',       price: 1450,  unit: 'pcs' },
  { name: 'MingLED Surface LED 12+4W Cool & Warm Round',    qty: 4,   category: 'Electronics', subcategory: 'Lighting',           brand: 'Ming',       price: 1450,  unit: 'pcs' },
  { name: 'MingLED Surface LED 18+6W Cool & Warm Round',    qty: 14,  category: 'Electronics', subcategory: 'Lighting',           brand: 'Ming',       price: 1950,  unit: 'pcs' },
  { name: 'Maxba Surface Panel Light 24W Square',           qty: 9,   category: 'Electronics', subcategory: 'Lighting',           brand: 'Maxba',      price: 2200,  unit: 'pcs' },
  { name: 'Maxba Surface Panel Light 24W Round',            qty: 18,  category: 'Electronics', subcategory: 'Lighting',           brand: 'Maxba',      price: 2200,  unit: 'pcs' },

  // ─── 4. BLIND RIVETS, HINGES & SCREWS (Sheet 2 & 3) ───────────────────────
  { name: 'SRC Blind Rivets 1/8 x 1/2 (300pcs)',            qty: 300, category: 'Hardware',  subcategory: 'Fasteners',           brand: 'SRC',        price: 4,     unit: 'pcs' },
  { name: 'SRC Blind Rivets 5/32 x 3/4 (500pcs)',           qty: 500, category: 'Hardware',  subcategory: 'Fasteners',           brand: 'SRC',        price: 5,     unit: 'pcs' },
  { name: 'SRC Blind Rivets 5/32 x 1/2 (1500pcs)',          qty: 1500, category: 'Hardware', subcategory: 'Fasteners',           brand: 'SRC',        price: 4,     unit: 'pcs' },
  { name: 'CM 12" Tee Hinges',                              qty: 130, category: 'Hardware',  subcategory: 'Door Fittings',       brand: 'CM',         price: 450,   unit: 'pcs' },
  { name: 'CM 8" Tee Hinges',                               qty: 75,  category: 'Hardware',  subcategory: 'Door Fittings',       brand: 'CM',         price: 320,   unit: 'pcs' },
  { name: 'Oxford 3" x 2" Butt Hinges',                     qty: 48,  category: 'Hardware',  subcategory: 'Door Fittings',       brand: 'Oxford',     price: 180,   unit: 'pcs' },
  { name: 'Oxford 4" x 3" Butt Hinges',                     qty: 72,  category: 'Hardware',  subcategory: 'Door Fittings',       brand: 'Oxford',     price: 260,   unit: 'pcs' },
  { name: 'Oxford 5" T Hinges',                             qty: 10,  category: 'Hardware',  subcategory: 'Door Fittings',       brand: 'Oxford',     price: 350,   unit: 'pcs' },
  { name: 'Oxford 5" Tee Hinges',                           qty: 40,  category: 'Hardware',  subcategory: 'Door Fittings',       brand: 'Oxford',     price: 350,   unit: 'pcs' },
  { name: 'Oxford Fastener (Left) Antique Copper',          qty: 24,  category: 'Hardware',  subcategory: 'Door Fittings',       brand: 'Oxford',     price: 480,   unit: 'pcs' },
  { name: 'Window Rings (144pcs)',                          qty: 144, category: 'Hardware',  subcategory: 'Door Fittings',       brand: 'Generic',    price: 120,   unit: 'pcs' },
  { name: 'Butt Hinges 4" x 2 1/2"',                        qty: 264, category: 'Hardware',  subcategory: 'Door Fittings',       brand: 'Generic',    price: 220,   unit: 'pcs' },
  { name: 'Tee Hinges 10"',                                 qty: 15,  category: 'Hardware',  subcategory: 'Door Fittings',       brand: 'Generic',    price: 420,   unit: 'pcs' },
  { name: 'Tower Bolt 2.5"',                                qty: 12,  category: 'Hardware',  subcategory: 'Door Fittings',       brand: 'Generic',    price: 180,   unit: 'pcs' },
  { name: 'Tower Bolt 4"',                                  qty: 24,  category: 'Hardware',  subcategory: 'Door Fittings',       brand: 'Generic',    price: 250,   unit: 'pcs' },
  { name: 'Tower Bolt 5"',                                  qty: 72,  category: 'Hardware',  subcategory: 'Door Fittings',       brand: 'Generic',    price: 320,   unit: 'pcs' },
  { name: 'Casement Stays 9"',                              qty: 288, category: 'Hardware',  subcategory: 'Door Fittings',       brand: 'Generic',    price: 280,   unit: 'pcs' },
  { name: 'Mountain Drywall Screw Black 1 1/4 x 6 (2000pcs)', qty: 2000, category: 'Hardware', subcategory: 'Fasteners',          brand: 'Mountain',   price: 2,     unit: 'pcs' },
  { name: 'Yalida Self Drilling Screw Black 1 1/4 x 8 (500pcs)', qty: 500, category: 'Hardware', subcategory: 'Fasteners',        brand: 'Yalida',     price: 3,     unit: 'pcs' },
  { name: 'Oxford Bugle Head Drywall Screw Black 6x1-1/2 (500pcs)', qty: 500, category: 'Hardware', subcategory: 'Fasteners',      brand: 'Oxford',     price: 2,     unit: 'pcs' },
  { name: 'Drywall Screw Size 6x1 (3000pcs)',               qty: 3000, category: 'Hardware', subcategory: 'Fasteners',          brand: 'Generic',    price: 2,     unit: 'pcs' },
  { name: 'Drywall Screw Size 6x1-1/4 (9000pcs)',           qty: 9000, category: 'Hardware', subcategory: 'Fasteners',          brand: 'Generic',    price: 2,     unit: 'pcs' },
  { name: 'Drywall Screw Size 8x2 (1000pcs)',               qty: 1000, category: 'Hardware', subcategory: 'Fasteners',          brand: 'Generic',    price: 3,     unit: 'pcs' },
  { name: 'Drywall Screw Size 7x1 (4000pcs)',               qty: 4000, category: 'Hardware', subcategory: 'Fasteners',          brand: 'Generic',    price: 2,     unit: 'pcs' },
  { name: 'Drywall Screw Size 7x1-1/4 (5000pcs)',           qty: 5000, category: 'Hardware', subcategory: 'Fasteners',          brand: 'Generic',    price: 2,     unit: 'pcs' },
  { name: 'Drywall Screw Size 8x1-1/4 (3000pcs)',           qty: 3000, category: 'Hardware', subcategory: 'Fasteners',          brand: 'Generic',    price: 2,     unit: 'pcs' },

  // ─── 5. ADDITIONAL BLIND RIVETS (Sheet 3 & 4) ─────────────────────────────
  { name: 'Blind Rivets 5/32 x 3/4 (1000pcs)',              qty: 1000, category: 'Hardware', subcategory: 'Fasteners',           brand: 'Generic',    price: 5,     unit: 'pcs' },
  { name: 'Blind Rivets 1/8 x 1/2 (2000pcs)',               qty: 2000, category: 'Hardware', subcategory: 'Fasteners',           brand: 'Generic',    price: 4,     unit: 'pcs' },
  { name: 'Blind Rivets 3/16 x 3/4 (2500pcs)',              qty: 2500, category: 'Hardware', subcategory: 'Fasteners',           brand: 'Generic',    price: 6,     unit: 'pcs' },
  { name: 'Blind Rivets 3/16 x 3/8 (2500pcs)',              qty: 2500, category: 'Hardware', subcategory: 'Fasteners',           brand: 'Generic',    price: 5,     unit: 'pcs' },
  { name: 'Blind Rivets 1/8 x 1 (1000pcs)',                 qty: 1000, category: 'Hardware', subcategory: 'Fasteners',           brand: 'Generic',    price: 5,     unit: 'pcs' },
  { name: 'Blind Rivets 5/32 x 3/8 (1000pcs)',              qty: 1000, category: 'Hardware', subcategory: 'Fasteners',           brand: 'Generic',    price: 4,     unit: 'pcs' },
  { name: 'Blind Rivets 1/8 x 1/4 (1000pcs)',               qty: 1000, category: 'Hardware', subcategory: 'Fasteners',           brand: 'Generic',    price: 3,     unit: 'pcs' },
  { name: 'Blind Rivets 5/32 x 1 (2500pcs)',                qty: 2500, category: 'Hardware', subcategory: 'Fasteners',           brand: 'Generic',    price: 6,     unit: 'pcs' },
  { name: 'BX Blind Rivets 5/32 x 3/4 (2000pcs)',           qty: 2000, category: 'Hardware', subcategory: 'Fasteners',           brand: 'BX',         price: 5,     unit: 'pcs' },
  { name: 'Blind Rivets 3/16 x 5/8 (500pcs)',               qty: 500,  category: 'Hardware', subcategory: 'Fasteners',           brand: 'Generic',    price: 6,     unit: 'pcs' },
  { name: 'SMS Blind Rivets 1/8 x 1/2 (2000pcs)',           qty: 2000, category: 'Hardware', subcategory: 'Fasteners',           brand: 'SMS',        price: 4,     unit: 'pcs' },
  { name: 'SMS Blind Rivets 1/8 x 1 (2000pcs)',             qty: 2000, category: 'Hardware', subcategory: 'Fasteners',           brand: 'SMS',        price: 5,     unit: 'pcs' },
  { name: 'CRC Blind Rivets 1/8 x 1 (1000pcs)',             qty: 1000, category: 'Hardware', subcategory: 'Fasteners',           brand: 'CRC',        price: 5,     unit: 'pcs' },
  { name: 'MANS Blind Rivets 1/8 x 3/4 (1000pcs)',          qty: 1000, category: 'Hardware', subcategory: 'Fasteners',           brand: 'MANS',       price: 5,     unit: 'pcs' },
  { name: 'MANS Blind Rivets 5/32 x 1 (1500pcs)',           qty: 1500, category: 'Hardware', subcategory: 'Fasteners',           brand: 'MANS',       price: 6,     unit: 'pcs' },

  // ─── 6. OXFORD HINGES & HASP & STAPLES (Sheet 4) ──────────────────────────
  { name: 'Oxford Butt Hinges 4x2x2mm Antique Copper',      qty: 24,  category: 'Hardware',  subcategory: 'Door Fittings',       brand: 'Oxford',     price: 280,   unit: 'pcs' },
  { name: 'Oxford Hasp & Staples 6"',                       qty: 60,  category: 'Hardware',  subcategory: 'Door Fittings',       brand: 'Oxford',     price: 320,   unit: 'pcs' },
  { name: 'Oxford Hasp & Staples 5"',                       qty: 60,  category: 'Hardware',  subcategory: 'Door Fittings',       brand: 'Oxford',     price: 280,   unit: 'pcs' },
  { name: 'Musical Door Bell Classic Series',               qty: 1,   category: 'Electronics', subcategory: 'Door Bells',         brand: 'Generic',    price: 1850,  unit: 'pcs' },
  { name: 'Chaote Aluminium Tower Bolt 4"',                 qty: 4,   category: 'Hardware',  subcategory: 'Door Fittings',       brand: 'Chaote',     price: 280,   unit: 'pcs' },
  { name: 'Chaote Aluminium Tower Bolt 3"',                 qty: 3,   category: 'Hardware',  subcategory: 'Door Fittings',       brand: 'Chaote',     price: 220,   unit: 'pcs' },
  { name: 'Oxford Butt Hinges 5" x 3" Black',               qty: 60,  category: 'Hardware',  subcategory: 'Door Fittings',       brand: 'Oxford',     price: 380,   unit: 'pcs' },
  { name: 'Oxford Butt Hinges 5" x 4" Black',               qty: 36,  category: 'Hardware',  subcategory: 'Door Fittings',       brand: 'Oxford',     price: 450,   unit: 'pcs' },
  { name: 'Oxford Butt Hinges 6" x 4" Black',               qty: 12,  category: 'Hardware',  subcategory: 'Door Fittings',       brand: 'Oxford',     price: 580,   unit: 'pcs' },
  { name: 'Oxford Hasp & Staples 4"',                       qty: 12,  category: 'Hardware',  subcategory: 'Door Fittings',       brand: 'Oxford',     price: 240,   unit: 'pcs' },
  { name: 'Oxford Hasp & Staples 3"',                       qty: 36,  category: 'Hardware',  subcategory: 'Door Fittings',       brand: 'Oxford',     price: 180,   unit: 'pcs' },
  { name: 'Oxford Hasp & Staples 2 1/2"',                   qty: 60,  category: 'Hardware',  subcategory: 'Door Fittings',       brand: 'Oxford',     price: 150,   unit: 'pcs' },
  { name: 'Cupboard Hinges with Box',                       qty: 3,   category: 'Hardware',  subcategory: 'Door Fittings',       brand: 'Generic',    price: 1200,  unit: 'box' },

  // ─── 7. SUNK BOXES, MEASURING TAPES & SANITARYWARE (Sheet 5) ───────────────
  { name: 'Polycrome Single Sunk Box',                      qty: 107, category: 'Electronics', subcategory: 'Switch Boxes',       brand: 'Polycrome',  price: 180,   unit: 'pcs' },
  { name: 'Polycrome Double Sunk Box',                      qty: 93,  category: 'Electronics', subcategory: 'Switch Boxes',       brand: 'Polycrome',  price: 280,   unit: 'pcs' },
  { name: 'Polycrome Triple Sunk Box',                      qty: 2,   category: 'Electronics', subcategory: 'Switch Boxes',       brand: 'Polycrome',  price: 420,   unit: 'pcs' },
  { name: 'Normal Single Sunk Box',                         qty: 32,  category: 'Electronics', subcategory: 'Switch Boxes',       brand: 'Generic',    price: 120,   unit: 'pcs' },
  { name: 'Normal Triple Sunk Box',                         qty: 20,  category: 'Electronics', subcategory: 'Switch Boxes',       brand: 'Generic',    price: 320,   unit: 'pcs' },
  { name: 'Yuhang Measuring Tape 15m',                      qty: 3,   category: 'Tools',       subcategory: 'Measuring Tools',    brand: 'Yuhang',     price: 950,   unit: 'pcs' },
  { name: 'Yuhang Measuring Tape 20m',                      qty: 2,   category: 'Tools',       subcategory: 'Measuring Tools',    brand: 'Yuhang',     price: 1250,  unit: 'pcs' },
  { name: 'Yuhang Measuring Tape 50m',                      qty: 1,   category: 'Tools',       subcategory: 'Measuring Tools',    brand: 'Yuhang',     price: 2400,  unit: 'pcs' },
  { name: 'Ennuo Professional Disc Ruler 20m',              qty: 1,   category: 'Tools',       subcategory: 'Measuring Tools',    brand: 'Ennuo',      price: 1850,  unit: 'pcs' },
  { name: 'Ennuo Professional Disc Ruler 30m',              qty: 2,   category: 'Tools',       subcategory: 'Measuring Tools',    brand: 'Ennuo',      price: 2400,  unit: 'pcs' },
  { name: 'Head Shower 6"',                                 qty: 2,   category: 'Plumbing',    subcategory: 'Sanitaryware',       brand: 'Generic',    price: 2200,  unit: 'pcs' },
  { name: 'Chromium Plated Head Shower',                    qty: 6,   category: 'Plumbing',    subcategory: 'Sanitaryware',       brand: 'Generic',    price: 2800,  unit: 'pcs' },
  { name: 'POIO Floor Drain 15x15cm (150mm x 150mm)',       qty: 11,  category: 'Plumbing',    subcategory: 'Sanitaryware',       brand: 'POIO',       price: 1450,  unit: 'pcs' },
  { name: 'POIO Floor Trap 150mm x 150mm',                  qty: 2,   category: 'Plumbing',    subcategory: 'Sanitaryware',       brand: 'POIO',       price: 1650,  unit: 'pcs' },
  { name: 'Soap Liquid Machine',                            qty: 3,   category: 'Plumbing',    subcategory: 'Sanitaryware',       brand: 'Generic',    price: 2400,  unit: 'pcs' },
  { name: 'Look JALI Floor Drain',                          qty: 1,   category: 'Plumbing',    subcategory: 'Sanitaryware',       brand: 'Look JALI',  price: 1850,  unit: 'pcs' },
  { name: 'Touch Soap Dispenser',                           qty: 2,   category: 'Plumbing',    subcategory: 'Sanitaryware',       brand: 'Generic',    price: 3200,  unit: 'pcs' },
  { name: 'Next Stainless Steel Shower',                    qty: 2,   category: 'Plumbing',    subcategory: 'Sanitaryware',       brand: 'Next',       price: 4500,  unit: 'pcs' },
  { name: 'AGS Stainless Steel Floor Strainer Grating 50mm (6"x6")', qty: 7, category: 'Plumbing', subcategory: 'Sanitaryware', brand: 'AGS',        price: 1250,  unit: 'pcs' },
];

async function insertProductsBatch15() {
  console.log('🚀 Starting Batch 15 Product Insertion & Smart Stock Upsert...\n');

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

  console.log(`\n🎉 BATCH 15 COMPLETE!`);
  console.log(`   ✅ New Products Inserted : ${insertedCount}`);
  console.log(`   🔄 Existing Stock Updated: ${updatedCount}`);
  console.log(`   📋 HKU series now at     : HKU_${String(hkuIndex - 1).padStart(2, '0')}`);
}

insertProductsBatch15()
  .catch(e => { console.error('❌ Error:', e.message); process.exit(1); })
  .finally(() => { prisma.$disconnect(); if (pool) pool.end(); });
