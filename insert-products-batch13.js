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
// BATCH 13 — HKU Series (Auto-continues from last HKU number in DB)
// Source: 5 handwritten audit sheets — Paints, Door Locks, Handles (with model codes),
//         LGTL Outdoor Lights (with secret SKU codes), Door Fittings
// ─────────────────────────────────────────────────────────────────────────────
const productsToInsert = [

  // ─── 1. PAINTS & VARNISHES (Sheet 1) ──────────────────────────────────────
  { name: 'Berlux Fast Dry QD Primer Black 1L',              qty: 4,   category: 'Paints',    subcategory: 'Primers',          brand: 'Berlux',     price: 2100,  unit: '1L' },
  { name: 'Berlux Saddle Gloss 1L',                         qty: 4,   category: 'Paints',    subcategory: 'Enamel Paint',     brand: 'Berlux',     price: 2150,  unit: '1L' },
  { name: 'Berlux Chalkboard Paint Black 1L',               qty: 3,   category: 'Paints',    subcategory: 'Specialty Paints', brand: 'Berlux',     price: 2800,  unit: '1L' },
  { name: 'Berlux Alc White 1L',                            qty: 10,  category: 'Paints',    subcategory: 'Specialty Paints', brand: 'Berlux',     price: 1950,  unit: '1L' },
  { name: 'Berlux Maroon 500ml',                            qty: 2,   category: 'Paints',    subcategory: 'Enamel Paint',     brand: 'Berlux',     price: 1250,  unit: '500ml' },
  { name: 'Berlux Jet Black 500ml',                         qty: 2,   category: 'Paints',    subcategory: 'Enamel Paint',     brand: 'Berlux',     price: 1250,  unit: '500ml' },
  { name: 'Berlux Brilliant Green 500ml',                   qty: 13,  category: 'Paints',    subcategory: 'Enamel Paint',     brand: 'Berlux',     price: 1250,  unit: '500ml' },
  { name: 'Berlux Aqua Pool 500ml',                         qty: 3,   category: 'Paints',    subcategory: 'Enamel Paint',     brand: 'Berlux',     price: 1250,  unit: '500ml' },
  { name: 'Berlux Butter Milk 500ml',                       qty: 8,   category: 'Paints',    subcategory: 'Enamel Paint',     brand: 'Berlux',     price: 1250,  unit: '500ml' },
  { name: 'Berlux Candy Stripe 500ml',                      qty: 4,   category: 'Paints',    subcategory: 'Enamel Paint',     brand: 'Berlux',     price: 1250,  unit: '500ml' },
  { name: 'Berlux Sealer Mahogany 500ml',                   qty: 4,   category: 'Paints',    subcategory: 'Wood Finishes',    brand: 'Berlux',     price: 1450,  unit: '500ml' },
  { name: 'Berlux Mahogany 500ml',                          qty: 1,   category: 'Paints',    subcategory: 'Enamel Paint',     brand: 'Berlux',     price: 1250,  unit: '500ml' },
  { name: 'Multilac Wood Lacquer 1L',                       qty: 4,   category: 'Paints',    subcategory: 'Wood Finishes',    brand: 'Multilac',   price: 2850,  unit: '1L' },
  { name: 'Multilac Polyurethane Varnish Super Clear 1L',  qty: 1,   category: 'Paints',    subcategory: 'Wood Finishes',    brand: 'Multilac',   price: 3200,  unit: '1L' },
  { name: 'Multilac Polyurethane Varnish Teak 1L',         qty: 1,   category: 'Paints',    subcategory: 'Wood Finishes',    brand: 'Multilac',   price: 3200,  unit: '1L' },
  { name: 'Berlux Alc Green 1L',                            qty: 1,   category: 'Paints',    subcategory: 'Specialty Paints', brand: 'Berlux',     price: 1950,  unit: '1L' },
  { name: 'J Chem Paints Enamel Super Gloss Black 1L',      qty: 1,   category: 'Paints',    subcategory: 'Enamel Paint',     brand: 'J Chem',     price: 2200,  unit: '1L' },

  // ─── 2. LIGHTING & DOOR FITTINGS (Sheet 2) ────────────────────────────────
  { name: 'Evershine Rechargeable LED Lamp 5W',            qty: 8,   category: 'Electronics', subcategory: 'Bulbs',              brand: 'Evershine',  price: 1850,  unit: 'box' },
  { name: 'UFO LED Lamp 50W',                               qty: 4,   category: 'Electronics', subcategory: 'Lighting',           brand: 'Generic',    price: 6800,  unit: 'box' },
  { name: 'Furniture Fitting Silver',                       qty: 3,   category: 'Hardware',  subcategory: 'Door Fittings',     brand: 'Generic',    price: 1200,  unit: 'box' },
  { name: 'Door Lock System UG8886 White',                  qty: 3,   category: 'Hardware',  subcategory: 'Door Locks',        brand: 'Generic',    price: 2400,  unit: 'box' },
  { name: 'Quantawin Long Door Closer',                     qty: 1,   category: 'Hardware',  subcategory: 'Door Closers',      brand: 'Quantawin',  price: 5800,  unit: 'box' },
  { name: 'JRP Door Closer 063 Automatic',                  qty: 5,   category: 'Hardware',  subcategory: 'Door Closers',      brand: 'JRP',        price: 4800,  unit: 'box' },
  { name: 'She Door Closer 063 Automatic',                  qty: 1,   category: 'Hardware',  subcategory: 'Door Closers',      brand: 'She',        price: 3200,  unit: 'box' },
  { name: 'JFK Door Lock',                                  qty: 1,   category: 'Hardware',  subcategory: 'Door Locks',        brand: 'JFK',        price: 2800,  unit: 'box' },
  { name: 'Ziga Door Lock SP Silver',                       qty: 3,   category: 'Hardware',  subcategory: 'Door Locks',        brand: 'Ziga',       price: 2600,  unit: 'box' },
  { name: 'Maya Laxmi Mortice Lock Set Silver',             qty: 3,   category: 'Hardware',  subcategory: 'Door Locks',        brand: 'Maya Laxmi', price: 3800,  unit: 'box' },
  { name: 'Excel Mortice Lock Set Silver',                  qty: 2,   category: 'Hardware',  subcategory: 'Door Locks',        brand: 'Excel',      price: 3400,  unit: 'box' },
  { name: 'Causte Door Lock Silver',                        qty: 1,   category: 'Hardware',  subcategory: 'Door Locks',        brand: 'Causte',     price: 2800,  unit: 'box' },
  { name: 'Balo Wooden Door Supporting System Silver',      qty: 1,   category: 'Hardware',  subcategory: 'Door Fittings',     brand: 'Balo',       price: 4500,  unit: 'box' },
  { name: 'Double Bull Flap Disc 115 x 22mm',               qty: 10,  category: 'Tools',     subcategory: 'Cutting & Abrasives', brand: 'Double Bull', price: 1850, unit: 'box' },
  { name: 'NC Technics Extension Power Socket 3m 13A',      qty: 1,   category: 'Electronics', subcategory: 'Sockets & Plugs',    brand: 'NC Technics', price: 3200, unit: 'box' },
  { name: 'Float Switch Fluid Level Controller 3m',          qty: 1,   category: 'Plumbing',  subcategory: 'Pumps & Motors',    brand: 'Generic',    price: 2400,  unit: 'pcs' },
  { name: 'Float Switch Fluid Level Controller 1.5m',        qty: 3,   category: 'Plumbing',  subcategory: 'Pumps & Motors',    brand: 'Generic',    price: 1850,  unit: 'pcs' },

  // ─── 3. DOOR HANDLES WITH MODEL CODES & FINISHES (Sheet 3) ────────────────
  { name: 'Wista Door Handle W25097 MAE',                   qty: 2,   category: 'Hardware',  subcategory: 'Door Handles',      brand: 'Wista',      price: 4200,  unit: 'pcs' },
  { name: 'Wista Door Handle W20606 MAB',                   qty: 1,   category: 'Hardware',  subcategory: 'Door Handles',      brand: 'Wista',      price: 3800,  unit: 'pcs' },
  { name: 'CBS Main Door Handle B8S1 MAE',                  qty: 1,   category: 'Hardware',  subcategory: 'Door Handles',      brand: 'CBS',        price: 5200,  unit: 'pcs' },
  { name: 'Bellagio Main Door Handle AL5845-01 MCF/C',      qty: 3,   category: 'Hardware',  subcategory: 'Door Handles',      brand: 'Bellagio',   price: 6800,  unit: 'pcs' },
  { name: 'Bellagio Main Door Handle AL5845-02 MCF/C',      qty: 4,   category: 'Hardware',  subcategory: 'Door Handles',      brand: 'Bellagio',   price: 6800,  unit: 'pcs' },
  { name: 'Causte Main Handle Lock B102-T01-3 CE',          qty: 2,   category: 'Hardware',  subcategory: 'Door Locks',        brand: 'Causte',     price: 4500,  unit: 'pcs' },
  { name: 'Bellucci Italy Door Handle ZS8866 ABB',          qty: 1,   category: 'Hardware',  subcategory: 'Door Handles',      brand: 'Bellucci',   price: 8500,  unit: 'pcs' },
  { name: 'Bellucci Italy Door Handle ZS8792-034 ABB',      qty: 1,   category: 'Hardware',  subcategory: 'Door Handles',      brand: 'Bellucci',   price: 8500,  unit: 'pcs' },
  { name: 'Bellucci Italy Door Handle ZS8709-1-333 ABB',    qty: 1,   category: 'Hardware',  subcategory: 'Door Handles',      brand: 'Bellucci',   price: 8500,  unit: 'pcs' },
  { name: 'Bellucci Italy Door Handle ZS8834-M9 MB/BN',    qty: 1,   category: 'Hardware',  subcategory: 'Door Handles',      brand: 'Bellucci',   price: 8800,  unit: 'pcs' },
  { name: 'Bellucci Italy Door Handle Z912-022 ABB',        qty: 1,   category: 'Hardware',  subcategory: 'Door Handles',      brand: 'Bellucci',   price: 7800,  unit: 'pcs' },
  { name: 'Bellucci Italy Door Handle HHS-242 ABB',         qty: 1,   category: 'Hardware',  subcategory: 'Door Handles',      brand: 'Bellucci',   price: 7800,  unit: 'pcs' },
  { name: 'Vinco Door Handle M10-18-11 MSN/CP',             qty: 2,   category: 'Hardware',  subcategory: 'Door Handles',      brand: 'Vinco',      price: 3800,  unit: 'pcs' },
  { name: 'Vinco Door Handle M10-18-8 MAE',                 qty: 1,   category: 'Hardware',  subcategory: 'Door Handles',      brand: 'Vinco',      price: 3600,  unit: 'pcs' },
  { name: 'Vinco Door Handle M10-18-7 MAE',                 qty: 2,   category: 'Hardware',  subcategory: 'Door Handles',      brand: 'Vinco',      price: 3600,  unit: 'pcs' },
  { name: 'Designerchoice Mortice Lock Set 5088-SS',        qty: 6,   category: 'Hardware',  subcategory: 'Door Locks',        brand: 'Designerchoice', price: 5400, unit: 'pcs' },
  { name: 'Sunflower Rim Lock 197-70',                      qty: 8,   category: 'Hardware',  subcategory: 'Door Locks',        brand: 'Sunflower',  price: 2800,  unit: 'pcs' },
  { name: 'Union Martin Lock Set J678-95-AS-3.0',          qty: 8,   category: 'Hardware',  subcategory: 'Door Locks',        brand: 'Union',      price: 4200,  unit: 'pcs' },
  { name: 'Wista Door Handle W22199 MAB',                   qty: 3,   category: 'Hardware',  subcategory: 'Door Handles',      brand: 'Wista',      price: 3800,  unit: 'pcs' },
  { name: 'Wista Door Handle W20188 MAE',                   qty: 3,   category: 'Hardware',  subcategory: 'Door Handles',      brand: 'Wista',      price: 4200,  unit: 'pcs' },
  { name: 'Wista Door Handle W25627 MAE',                   qty: 2,   category: 'Hardware',  subcategory: 'Door Handles',      brand: 'Wista',      price: 4500,  unit: 'pcs' },
  { name: 'Wista Door Handle V42826 MAE',                   qty: 1,   category: 'Hardware',  subcategory: 'Door Handles',      brand: 'Wista',      price: 4200,  unit: 'pcs' },
  { name: 'Wista Door Handle V42826 MAB',                   qty: 1,   category: 'Hardware',  subcategory: 'Door Handles',      brand: 'Wista',      price: 4200,  unit: 'pcs' },
  { name: 'Bell Mount Main Door Locking System B5176 MAB/BN', qty: 4, category: 'Hardware',  subcategory: 'Door Locks',        brand: 'Bell Mount', price: 7800,  unit: 'pcs' },
  { name: 'Bell Mount Main Door Locking System B5188 MSN/BN', qty: 3, category: 'Hardware',  subcategory: 'Door Locks',        brand: 'Bell Mount', price: 7800,  unit: 'pcs' },
  { name: 'Bell Mount Main Door Locking System 8576 MSN/BN', qty: 2, category: 'Hardware',  subcategory: 'Door Locks',        brand: 'Bell Mount', price: 6800,  unit: 'pcs' },
  { name: 'Bell Mount Main Door Locking System 8888 MSN/BN', qty: 6, category: 'Hardware',  subcategory: 'Door Locks',        brand: 'Bell Mount', price: 6800,  unit: 'pcs' },
  { name: 'Bell Mount Main Door Locking System 8876 MSN/BN', qty: 6, category: 'Hardware',  subcategory: 'Door Locks',        brand: 'Bell Mount', price: 6800,  unit: 'pcs' },

  // ─── 4. LGTL & VENUS LIGHTS WITH SECRET SKU CODES (Sheet 4) ────────────────
  { name: 'LGTL Outdoor Lamp S-EF-ODL-084 16W',             qty: 1,   category: 'Electronics', subcategory: 'Outdoor Lighting',   brand: 'LGTL',       price: 3800,  unit: 'pcs' },
  { name: 'LGTL Outdoor Lamp S-EF-ODL-164 8W',              qty: 3,   category: 'Electronics', subcategory: 'Outdoor Lighting',   brand: 'LGTL',       price: 2400,  unit: 'pcs' },
  { name: 'Venus Spotlight S-EF-SPL-262 5W',                qty: 1,   category: 'Electronics', subcategory: 'Lighting',           brand: 'Venus',      price: 1850,  unit: 'pcs' },
  { name: 'LGTL Garden Lamp S-EF-GDL-026 5W',               qty: 2,   category: 'Electronics', subcategory: 'Outdoor Lighting',   brand: 'LGTL',       price: 2200,  unit: 'pcs' },
  { name: 'LGTL Garden Lamp S-F-SPL-135 5W',                qty: 2,   category: 'Electronics', subcategory: 'Outdoor Lighting',   brand: 'LGTL',       price: 2200,  unit: 'pcs' },
  { name: 'LGTL Wall Lamp S-EF-ODL-205 8W',                 qty: 1,   category: 'Electronics', subcategory: 'Outdoor Lighting',   brand: 'LGTL',       price: 2600,  unit: 'pcs' },
  { name: 'LGTL Wall Lamp S-EF-ODL-207 6W',                 qty: 26,  category: 'Electronics', subcategory: 'Outdoor Lighting',   brand: 'LGTL',       price: 2400,  unit: 'pcs' },
  { name: 'LGTL LED Call Lamp S-EF-ODL-175 6W',             qty: 4,   category: 'Electronics', subcategory: 'Outdoor Lighting',   brand: 'LGTL',       price: 2200,  unit: 'pcs' },
  { name: 'LGTL Down Light A-EF-DLN-067 5W',                qty: 1,   category: 'Electronics', subcategory: 'Lighting',           brand: 'LGTL',       price: 1650,  unit: 'pcs' },
  { name: 'LGTL Outdoor Lamp A-EF-ODL-004 23W',             qty: 41,  category: 'Electronics', subcategory: 'Outdoor Lighting',   brand: 'LGTL',       price: 5400,  unit: 'pcs' },
  { name: 'LGTL147 Solar Street Light S-EF-SDL-210 3W',     qty: 68,  category: 'Electronics', subcategory: 'Outdoor Lighting',   brand: 'LGTL',       price: 4800,  unit: 'pcs' },
  { name: 'LGTL Street Light S-EF-SFN-134 5W',              qty: 12,  category: 'Electronics', subcategory: 'Outdoor Lighting',   brand: 'LGTL',       price: 3200,  unit: 'pcs' },
  { name: 'LGTL Wall Lamp S-EF-ODL-221 4W',                 qty: 2,   category: 'Electronics', subcategory: 'Outdoor Lighting',   brand: 'LGTL',       price: 1850,  unit: 'pcs' },
  { name: 'LGTL Outdoor Lamp S-EF-ODL-212 4W',              qty: 21,  category: 'Electronics', subcategory: 'Outdoor Lighting',   brand: 'LGTL',       price: 1950,  unit: 'pcs' },
  { name: 'LGTL Spotlight S-EF-ODL-332 2.5W',              qty: 1,   category: 'Electronics', subcategory: 'Lighting',           brand: 'LGTL',       price: 1450,  unit: 'pcs' },
  { name: 'LGTL Corner Light 08-23',                        qty: 1,   category: 'Electronics', subcategory: 'Lighting',           brand: 'LGTL',       price: 2800,  unit: 'pcs' },
  { name: 'LGTL Outdoor Lamp A-EF-ODL-003 3W',              qty: 43,  category: 'Electronics', subcategory: 'Outdoor Lighting',   brand: 'LGTL',       price: 1650,  unit: 'pcs' },
  { name: 'LGTL Outdoor Lamp 3-EF-ODL-077 4W',              qty: 1,   category: 'Electronics', subcategory: 'Outdoor Lighting',   brand: 'LGTL',       price: 1850,  unit: 'pcs' },
  { name: 'LGTL Outdoor Lamp A-EF-ODL-009 2x5W',            qty: 2,   category: 'Electronics', subcategory: 'Outdoor Lighting',   brand: 'LGTL',       price: 3200,  unit: 'pcs' },
  { name: 'LGTL Step Light A-EF-LMP-001 2W',                qty: 26,  category: 'Electronics', subcategory: 'Outdoor Lighting',   brand: 'LGTL',       price: 1650,  unit: 'pcs' },
  { name: 'LGTL Step Light A-EF-LMP-001 3W',                qty: 13,  category: 'Electronics', subcategory: 'Outdoor Lighting',   brand: 'LGTL',       price: 1850,  unit: 'pcs' },
  { name: 'LGTL Flood Light A-EF-HLL-011 10W',              qty: 1,   category: 'Electronics', subcategory: 'Flood Lights',       brand: 'LGTL',       price: 2200,  unit: 'pcs' },
  { name: 'LGTL Flood Light A-EF-HLL-005 20W',              qty: 5,   category: 'Electronics', subcategory: 'Flood Lights',       brand: 'LGTL',       price: 3200,  unit: 'pcs' },
  { name: 'LGTL Flood Light A-EF-HLL-074 20W',              qty: 5,   category: 'Electronics', subcategory: 'Flood Lights',       brand: 'LGTL',       price: 3200,  unit: 'pcs' },
  { name: 'LGTL Flood Light A-EF-HLL-072 10W',              qty: 69,  category: 'Electronics', subcategory: 'Flood Lights',       brand: 'LGTL',       price: 2200,  unit: 'pcs' },
  { name: 'Wakbar Flood Light 320W',                        qty: 2,   category: 'Electronics', subcategory: 'Flood Lights',       brand: 'Wakbar',     price: 18500, unit: 'pcs' },
  { name: 'Infrared Motion Sensor',                         qty: 1,   category: 'Electronics', subcategory: 'Dimmers & Controllers', brand: 'Generic', price: 1850,  unit: 'pcs' },
  { name: 'Infrared Motion Sensor 1000W-2000W',             qty: 3,   category: 'Electronics', subcategory: 'Dimmers & Controllers', brand: 'Generic', price: 3200,  unit: 'pcs' },
  { name: 'Green Lighting High LED COB 3x1W',               qty: 1,   category: 'Electronics', subcategory: 'Lighting',           brand: 'Green Lighting', price: 1450, unit: 'pcs' },
  { name: 'LGTL LED Wall Light S-EF-ODL-255 16W',           qty: 1,   category: 'Electronics', subcategory: 'Outdoor Lighting',   brand: 'LGTL',       price: 3800,  unit: 'pcs' },
  { name: 'Hedans Motion Sensor 1200W-3000W',               qty: 1,   category: 'Electronics', subcategory: 'Dimmers & Controllers', brand: 'Hedans', price: 4200,  unit: 'pcs' },
  { name: 'Hedans Wall Lamp WT 10W',                        qty: 1,   category: 'Electronics', subcategory: 'Outdoor Lighting',   brand: 'Hedans',     price: 2800,  unit: 'pcs' },

  // ─── 5. DOOR & WINDOW FITTINGS (Sheet 5) ──────────────────────────────────
  { name: 'Oxford Door Ring Copper Plated',                 qty: 50,  category: 'Hardware',  subcategory: 'Door Fittings',     brand: 'Oxford',     price: 280,   unit: 'pcs' },
];

async function insertProductsBatch13() {
  console.log('🚀 Starting Batch 13 Product Insertion & Smart Stock Upsert...\n');

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

  console.log(`\n🎉 BATCH 13 COMPLETE!`);
  console.log(`   ✅ New Products Inserted : ${insertedCount}`);
  console.log(`   🔄 Existing Stock Updated: ${updatedCount}`);
  console.log(`   📋 HKU series now at     : HKU_${String(hkuIndex - 1).padStart(2, '0')}`);
}

insertProductsBatch13()
  .catch(e => { console.error('❌ Error:', e.message); process.exit(1); })
  .finally(() => { prisma.$disconnect(); if (pool) pool.end(); });
