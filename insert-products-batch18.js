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
// BATCH 18 — HKU Series (5-Page Audit Handwritten Product Additions)
// Source: 5 Handwritten Audit Pages (September 9, 2026 Audit)
// Covers: Outdoor & Wall Lamps (LGL, JKK), Venus LED Spotlights, Enclosure Boxes
//         (Polycrome, Kevilton), Door Locks (Bellucci, KEVIN), Oxford Hinges/Fasteners,
//         National Garden Hoses, Power Tools & Bathroom Sets
// ─────────────────────────────────────────────────────────────────────────────
const productsToInsert = [

  // ─── PAGE 1: LIGHTING, ENCLOSURE BOXES & SPOTLIGHTS ───────────────────────
  { name: 'LGL Outdoor Lamp Black (S-EF-ODL-004)', qty: 23, category: 'Lighting & Electrical', subcategory: 'Outdoor Lamps', brand: 'LGL', price: 3450, unit: 'pcs' },
  { name: 'LGL Bulkhead Lamp', qty: 35, category: 'Lighting & Electrical', subcategory: 'Outdoor Lamps', brand: 'LGL', price: 1850, unit: 'pcs' },
  { name: 'Venus LED Spot Light 5W Round (S-EF-SPL-162)', qty: 50, category: 'Lighting & Electrical', subcategory: 'Spotlights', brand: 'VENUS', price: 650, unit: 'pcs' },
  { name: 'Venus LED Spot Light 5W Round (S-EF-SPL-163)', qty: 50, category: 'Lighting & Electrical', subcategory: 'Spotlights', brand: 'VENUS', price: 650, unit: 'pcs' },
  { name: 'Livorno Bathroom Accessory Set', qty: 3, category: 'Plumbing & Sanitaryware', subcategory: 'Bathroom Accessories', brand: 'LIVORNO', price: 4850, unit: 'set' },
  { name: 'Galaxy Hand Shower with Handle', qty: 3, category: 'Plumbing & Sanitaryware', subcategory: 'Bathroom Accessories', brand: 'Galaxy', price: 2250, unit: 'set' },
  { name: 'Westa Hand Shower with Handle', qty: 3, category: 'Plumbing & Sanitaryware', subcategory: 'Bathroom Accessories', brand: 'Westa', price: 2450, unit: 'set' },
  { name: 'LGL Black Wall Lamp (S-EF-ODL-314)', qty: 5, category: 'Lighting & Electrical', subcategory: 'Wall Lamps', brand: 'LGL', price: 3250, unit: 'pcs' },
  { name: 'LGL Black Wall Lamp (S-EF-ODL-287)', qty: 2, category: 'Lighting & Electrical', subcategory: 'Wall Lamps', brand: 'LGL', price: 2950, unit: 'pcs' },
  { name: 'LGL Black Wall Lamp (S-EF-LMP-279)', qty: 1, category: 'Lighting & Electrical', subcategory: 'Wall Lamps', brand: 'LGL', price: 2850, unit: 'pcs' },
  { name: 'LGL Black Wall Lamp (S-EF-ODL-342)', qty: 4, category: 'Lighting & Electrical', subcategory: 'Wall Lamps', brand: 'LGL', price: 3450, unit: 'pcs' },
  { name: 'Polycrome ABC Enclosure Surface Mounting 18-Way', qty: 3, category: 'Lighting & Electrical', subcategory: 'Enclosure Boxes', brand: 'Polycrome', price: 2450, unit: 'pcs' },
  { name: 'Polycrome ABC Enclosure Sunk Mounting 18-Way', qty: 2, category: 'Lighting & Electrical', subcategory: 'Enclosure Boxes', brand: 'Polycrome', price: 2350, unit: 'pcs' },
  { name: 'Polycrome ABC Enclosure Sunk Mounting 15-Way', qty: 3, category: 'Lighting & Electrical', subcategory: 'Enclosure Boxes', brand: 'Polycrome', price: 2150, unit: 'pcs' },
  { name: 'Kevilton Plastic Enclosure Sunk Mounting 15-Way', qty: 1, category: 'Lighting & Electrical', subcategory: 'Enclosure Boxes', brand: 'KEVILTON', price: 1950, unit: 'pcs' },
  { name: 'Polycrome ABC Enclosure Box 10-Way', qty: 6, category: 'Lighting & Electrical', subcategory: 'Enclosure Boxes', brand: 'Polycrome', price: 1650, unit: 'pcs' },
  { name: 'Polycrome ABC Enclosure Sunk Mounting 36-Way', qty: 1, category: 'Lighting & Electrical', subcategory: 'Enclosure Boxes', brand: 'Polycrome', price: 4850, unit: 'pcs' },
  { name: 'Polycrome ABC Enclosure Box 16-Way (Surface)', qty: 1, category: 'Lighting & Electrical', subcategory: 'Enclosure Boxes', brand: 'Polycrome', price: 2250, unit: 'pcs' },
  { name: 'Kevilton Plastic Enclosure Sunk Mounting 12-Way', qty: 1, category: 'Lighting & Electrical', subcategory: 'Enclosure Boxes', brand: 'KEVILTON', price: 1750, unit: 'pcs' },
  { name: 'Polycrome ABC Enclosure Surface Mounting 35-Way', qty: 2, category: 'Lighting & Electrical', subcategory: 'Enclosure Boxes', brand: 'Polycrome', price: 4750, unit: 'pcs' },
  { name: 'Polycrome ABC Enclosure Surface Mounting 24-Way', qty: 7, category: 'Lighting & Electrical', subcategory: 'Enclosure Boxes', brand: 'Polycrome', price: 3450, unit: 'pcs' },
  { name: 'Polycrome ABC Enclosure Box 18-Way (Surface)', qty: 2, category: 'Lighting & Electrical', subcategory: 'Enclosure Boxes', brand: 'Polycrome', price: 2550, unit: 'pcs' },
  { name: 'Polycrome ABC Enclosure Surface Mounting 12-Way', qty: 1, category: 'Lighting & Electrical', subcategory: 'Enclosure Boxes', brand: 'Polycrome', price: 1850, unit: 'pcs' },
  { name: 'Polycrome ABC Enclosure Type 1019', qty: 1, category: 'Lighting & Electrical', subcategory: 'Enclosure Boxes', brand: 'Polycrome', price: 1450, unit: 'pcs' },
  { name: 'Waterproof Outdoor Distribution Box', qty: 6, category: 'Lighting & Electrical', subcategory: 'Enclosure Boxes', brand: 'Generic', price: 2850, unit: 'pcs' },
  { name: 'Venus LED Spot Light 5W Round', qty: 246, category: 'Lighting & Electrical', subcategory: 'Spotlights', brand: 'VENUS', price: 650, unit: 'pcs' },
  { name: 'Venus LED Spot Light 3W Round', qty: 122, category: 'Lighting & Electrical', subcategory: 'Spotlights', brand: 'VENUS', price: 550, unit: 'pcs' },

  // ─── PAGE 2: TWINES, WALL LAMPS & MOISTURE PROOF ─────────────────────────
  { name: 'Star Nylon Twine (30 PLY)', qty: 75, category: 'Hardware & Tools', subcategory: 'Ropes & Twines', brand: 'Star', price: 480, unit: 'pcs' },
  { name: 'LGL Wall Lamp 10W (S-EF-ODL-310)', qty: 13, category: 'Lighting & Electrical', subcategory: 'Wall Lamps', brand: 'LGL', price: 2650, unit: 'pcs' },
  { name: 'LGL Wall Lamp 10W (S-EF-ODL-312)', qty: 12, category: 'Lighting & Electrical', subcategory: 'Wall Lamps', brand: 'LGL', price: 2650, unit: 'pcs' },
  { name: 'LGL Wall Lamp 10W (S-EF-ODL-307)', qty: 12, category: 'Lighting & Electrical', subcategory: 'Wall Lamps', brand: 'LGL', price: 2650, unit: 'pcs' },
  { name: 'LGL Wall Lamp 6W (S-EF-ODL-291)', qty: 3, category: 'Lighting & Electrical', subcategory: 'Wall Lamps', brand: 'LGL', price: 2250, unit: 'pcs' },
  { name: 'LGL Wall Lamp 4W (S-EF-ODL-221)', qty: 19, category: 'Lighting & Electrical', subcategory: 'Wall Lamps', brand: 'LGL', price: 1850, unit: 'pcs' },
  { name: 'LGL Wall Lamp (S-EF-ODL-212)', qty: 1, category: 'Lighting & Electrical', subcategory: 'Wall Lamps', brand: 'LGL', price: 1750, unit: 'pcs' },
  { name: 'JKK Moisture Proof Lamp', qty: 9, category: 'Lighting & Electrical', subcategory: 'Outdoor Lamps', brand: 'JKK', price: 2450, unit: 'pcs' },
  { name: 'LGL Outdoor Lamp Warm White 15W', qty: 24, category: 'Lighting & Electrical', subcategory: 'Outdoor Lamps', brand: 'LGL', price: 3250, unit: 'pcs' },
  { name: 'LGL Outdoor Lamp Warm White 4W', qty: 1, category: 'Lighting & Electrical', subcategory: 'Outdoor Lamps', brand: 'LGL', price: 1850, unit: 'pcs' },

  // ─── PAGE 3: FLOOD LIGHTS, PUMP CONTROLLERS & STEP LAMPS ───────────────────
  { name: 'LGL LED Flood Light 400W', qty: 1, category: 'Lighting & Electrical', subcategory: 'Flood Lights', brand: 'LGL', price: 14500, unit: 'pcs' },
  { name: 'LGL LED Flood Light 300W', qty: 1, category: 'Lighting & Electrical', subcategory: 'Flood Lights', brand: 'LGL', price: 11500, unit: 'pcs' },
  { name: 'Smartec Pump Controller 1.1KW Mod. ST-EPCO2', qty: 4, category: 'Machinery & Equipment', subcategory: 'Pumps & Controllers', brand: 'Smartec', price: 6850, unit: 'pcs' },
  { name: 'Smartec Pump Controller Mod. ST-EPCO3', qty: 4, category: 'Machinery & Equipment', subcategory: 'Pumps & Controllers', brand: 'Smartec', price: 7250, unit: 'pcs' },
  { name: 'LGL JKK LED Step Lamp 3W', qty: 20, category: 'Lighting & Electrical', subcategory: 'Outdoor Lamps', brand: 'LGL', price: 1450, unit: 'pcs' },
  { name: 'LGL LED Garden Lamp 5W', qty: 16, category: 'Lighting & Electrical', subcategory: 'Outdoor Lamps', brand: 'LGL', price: 2450, unit: 'pcs' },
  { name: 'LGL LED Ice Cubes 18W', qty: 1, category: 'Lighting & Electrical', subcategory: 'Decorative Lamps', brand: 'LGL', price: 3850, unit: 'pcs' },
  { name: 'OFK LED Bulkhead Lamp 12W (WP-17-BL)', qty: 8, category: 'Lighting & Electrical', subcategory: 'Outdoor Lamps', brand: 'OFK', price: 1950, unit: 'pcs' },
  { name: 'LGL LSQ Outdoor Plastic Body Wall Lamp 4W', qty: 3, category: 'Lighting & Electrical', subcategory: 'Wall Lamps', brand: 'LGL', price: 1750, unit: 'pcs' },
  { name: 'Venus LED Spot Light 10W', qty: 14, category: 'Lighting & Electrical', subcategory: 'Spotlights', brand: 'VENUS', price: 950, unit: 'pcs' },

  // ─── PAGE 4: DOOR LOCKS, CEILING LAMPS & SCALES ──────────────────────────
  { name: 'LGL Wall Lamp 10W (S-EF-DLN-056)', qty: 17, category: 'Lighting & Electrical', subcategory: 'Wall Lamps', brand: 'LGL', price: 2650, unit: 'pcs' },
  { name: 'LGL Wall Lamp 15W (S-EF-DLN)', qty: 3, category: 'Lighting & Electrical', subcategory: 'Wall Lamps', brand: 'LGL', price: 3250, unit: 'pcs' },
  { name: 'Lipar Lamp 40W', qty: 10, category: 'Lighting & Electrical', subcategory: 'Bulbs & Lamps', brand: 'Lipar', price: 450, unit: 'pcs' },
  { name: 'Lipar Lamp 20W', qty: 2, category: 'Lighting & Electrical', subcategory: 'Bulbs & Lamps', brand: 'Lipar', price: 350, unit: 'pcs' },
  { name: 'Lipar LED Lamp 40W', qty: 6, category: 'Lighting & Electrical', subcategory: 'Bulbs & Lamps', brand: 'Lipar', price: 850, unit: 'pcs' },
  { name: 'Bellucci Door Lock (Z58919-Q24-ABB)', qty: 14, category: 'Building Materials', subcategory: 'Door Locks & Handles', brand: 'Bellucci', price: 6850, unit: 'pcs' },
  { name: 'HEDANS Ceiling Lamp', qty: 5, category: 'Lighting & Electrical', subcategory: 'Ceiling Lamps', brand: 'HEDANS', price: 2850, unit: 'pcs' },
  { name: 'Luminar Flood Light 100W', qty: 2, category: 'Lighting & Electrical', subcategory: 'Flood Lights', brand: 'Luminar', price: 4850, unit: 'pcs' },
  { name: 'Westa Bathroom Accessories', qty: 2, category: 'Plumbing & Sanitaryware', subcategory: 'Bathroom Accessories', brand: 'Westa', price: 3450, unit: 'set' },
  { name: 'Bellucci Door Lock HHS-242 ABQ', qty: 2, category: 'Building Materials', subcategory: 'Door Locks & Handles', brand: 'Bellucci', price: 6450, unit: 'pcs' },
  { name: 'Bellucci Door Lock Z58919-Q24 SS', qty: 2, category: 'Building Materials', subcategory: 'Door Locks & Handles', brand: 'Bellucci', price: 6850, unit: 'pcs' },
  { name: 'Bellucci Door Lock Z58378-Q23 ABB', qty: 7, category: 'Building Materials', subcategory: 'Door Locks & Handles', brand: 'Bellucci', price: 6250, unit: 'pcs' },
  { name: 'Bellucci Door Lock Z58877-Q21 AC', qty: 1, category: 'Building Materials', subcategory: 'Door Locks & Handles', brand: 'Bellucci', price: 5950, unit: 'pcs' },
  { name: 'Bellucci Door Lock Z58887-J102 CF', qty: 1, category: 'Building Materials', subcategory: 'Door Locks & Handles', brand: 'Bellucci', price: 6450, unit: 'pcs' },
  { name: 'Bellucci Door Lock Z58919-Q22 CF', qty: 2, category: 'Building Materials', subcategory: 'Door Locks & Handles', brand: 'Bellucci', price: 6450, unit: 'pcs' },
  { name: 'Bellucci Door Lock Z58838-P4 NB/BN', qty: 1, category: 'Building Materials', subcategory: 'Door Locks & Handles', brand: 'Bellucci', price: 6250, unit: 'pcs' },
  { name: 'KEVIN Door Lock F5088-08-AC', qty: 5, category: 'Building Materials', subcategory: 'Door Locks & Handles', brand: 'KEVIN', price: 4850, unit: 'pcs' },
  { name: 'KEVIN Door Lock F5088-08 BN/GP', qty: 1, category: 'Building Materials', subcategory: 'Door Locks & Handles', brand: 'KEVIN', price: 4950, unit: 'pcs' },
  { name: 'KEVIN Door Lock F5088-08 CF', qty: 1, category: 'Building Materials', subcategory: 'Door Locks & Handles', brand: 'KEVIN', price: 4850, unit: 'pcs' },
  { name: 'LGL LED Surface Light 6W Warm White (Round)', qty: 12, category: 'Lighting & Electrical', subcategory: 'Ceiling Lamps', brand: 'LGL', price: 850, unit: 'pcs' },
  { name: 'FIKK Mini Scale (100kg)', qty: 5, category: 'Hardware & Tools', subcategory: 'Measuring & Scales', brand: 'FIKK', price: 8500, unit: 'pcs' },

  // ─── PAGE 5: GARDEN HOSES, OXFORD HINGES, POWER TOOLS & SENSORS ──────────
  { name: 'National Garden Hose 12.5mm × 15m', qty: 10, category: 'Gardening & Agricultural', subcategory: 'Hoses & Fittings', brand: 'National', price: 3850, unit: 'pcs' },
  { name: 'National Garden Hose 12.5mm × 30m', qty: 6, category: 'Gardening & Agricultural', subcategory: 'Hoses & Fittings', brand: 'National', price: 6850, unit: 'pcs' },
  { name: 'National Garden Hose 25mm × 15m', qty: 6, category: 'Gardening & Agricultural', subcategory: 'Hoses & Fittings', brand: 'National', price: 5850, unit: 'pcs' },
  { name: 'National Garden Hose 25mm × 30m', qty: 6, category: 'Gardening & Agricultural', subcategory: 'Hoses & Fittings', brand: 'National', price: 9850, unit: 'pcs' },
  { name: 'Oxford Butt Hinges 2" × 2"', qty: 288, category: 'Building Materials', subcategory: 'Hinges & Bolts', brand: 'Oxford', price: 85, unit: 'pcs' },
  { name: 'Oxford Butt Hinges 3" × 2"', qty: 72, category: 'Building Materials', subcategory: 'Hinges & Bolts', brand: 'Oxford', price: 135, unit: 'pcs' },
  { name: 'Oxford Butt Hinges 5" × 3"', qty: 36, category: 'Building Materials', subcategory: 'Hinges & Bolts', brand: 'Oxford', price: 280, unit: 'pcs' },
  { name: 'Oxford Butt Hinges 4" × 2.5"', qty: 408, category: 'Building Materials', subcategory: 'Hinges & Bolts', brand: 'Oxford', price: 210, unit: 'pcs' },
  { name: 'Oxford Butt Hinges 4" × 2"', qty: 120, category: 'Building Materials', subcategory: 'Hinges & Bolts', brand: 'Oxford', price: 180, unit: 'pcs' },
  { name: 'Oxford Tee Hinges 10"', qty: 165, category: 'Building Materials', subcategory: 'Hinges & Bolts', brand: 'Oxford', price: 340, unit: 'pcs' },
  { name: 'Oxford Tee Hinges 12"', qty: 60, category: 'Building Materials', subcategory: 'Hinges & Bolts', brand: 'Oxford', price: 420, unit: 'pcs' },
  { name: 'Oxford Tee Hinges 6"', qty: 100, category: 'Building Materials', subcategory: 'Hinges & Bolts', brand: 'Oxford', price: 220, unit: 'pcs' },
  { name: 'Oxford Tee Hinges 10" (Heavy)', qty: 60, category: 'Building Materials', subcategory: 'Hinges & Bolts', brand: 'Oxford', price: 360, unit: 'pcs' },
  { name: 'Oxford Tee Hinges 8"', qty: 30, category: 'Building Materials', subcategory: 'Hinges & Bolts', brand: 'Oxford', price: 290, unit: 'pcs' },
  { name: 'Oxford Tower Bolt 4"', qty: 60, category: 'Building Materials', subcategory: 'Hinges & Bolts', brand: 'Oxford', price: 195, unit: 'pcs' },
  { name: 'Oxford Window Fastener Left', qty: 132, category: 'Building Materials', subcategory: 'Hinges & Bolts', brand: 'Oxford', price: 165, unit: 'pcs' },
  { name: 'Oxford Window Fastener Right', qty: 144, category: 'Building Materials', subcategory: 'Hinges & Bolts', brand: 'Oxford', price: 165, unit: 'pcs' },
  { name: 'KOBE Rotary Hammer 800W', qty: 2, category: 'Power Tools', subcategory: 'Power Tools', brand: 'KOBE', price: 16500, unit: 'pcs' },
  { name: 'LGL Wall Fan 16"', qty: 2, category: 'Home Appliances', subcategory: 'Fans & Cooling', brand: 'LGL', price: 7850, unit: 'pcs' },
  { name: 'MANS 5 Pieces ABS Bathroom Set', qty: 4, category: 'Plumbing & Sanitaryware', subcategory: 'Bathroom Accessories', brand: 'MANS', price: 5850, unit: 'set' },
  { name: 'LGL Wall Light (S-EF-LMP-279)', qty: 10, category: 'Lighting & Electrical', subcategory: 'Wall Lamps', brand: 'LGL', price: 2850, unit: 'pcs' },
  { name: 'EMTOP Lithium-Ion Grass Trimmer', qty: 1, category: 'Gardening & Agricultural', subcategory: 'Power Tools', brand: 'EMTOP', price: 18500, unit: 'pcs' },
  { name: 'HEDANS Infrared Motion Sensor', qty: 2, category: 'Lighting & Electrical', subcategory: 'Sensors & Automation', brand: 'HEDANS', price: 2450, unit: 'pcs' },
  { name: 'HEDANS LED Light (1+1)W', qty: 17, category: 'Lighting & Electrical', subcategory: 'Bulbs & Lamps', brand: 'HEDANS', price: 450, unit: 'pcs' },
];

async function insertProductsBatch18() {
  console.log('🚀 Starting Batch 18 Product Insertion & Smart Stock Upsert...\n');

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
  const existingByModelCode = new Map();
  let maxHkuNum = 0;

  allExisting.forEach(p => {
    existingByName.set(p.name.toLowerCase().trim(), p);

    // Extract model codes like S-EF-ODL-004, ST-EPCO2, Z58919-Q24, etc.
    const modelMatch = p.name.match(/([A-Z0-9]{2,}-[A-Z0-9-]{3,})/i);
    if (modelMatch) {
      existingByModelCode.set(modelMatch[1].toLowerCase().trim(), p);
    }

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
    // 1. Try exact name match
    let existingProd = existingByName.get(item.name.toLowerCase().trim());

    // 2. If not found, try model code match (e.g., S-EF-ODL-004)
    if (!existingProd) {
      const modelMatch = item.name.match(/([A-Z0-9]{2,}-[A-Z0-9-]{3,})/i);
      if (modelMatch) {
        existingProd = existingByModelCode.get(modelMatch[1].toLowerCase().trim());
      }
    }

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
      console.log(`[STOCK+] ${existingProd.sku.padEnd(8)} | +${String(item.qty).padStart(3)} | ${existingProd.name} (Matched for: ${item.name})`);
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

  console.log(`\n🎉 BATCH 18 COMPLETE!`);
  console.log(`   ✅ New Products Inserted : ${insertedCount}`);
  console.log(`   🔄 Existing Stock Updated: ${updatedCount}`);
  console.log(`   📋 HKU series now at     : HKU_${String(hkuIndex - 1).padStart(2, '0')}`);
}

insertProductsBatch18()
  .catch(e => { console.error('❌ Error:', e.message); process.exit(1); })
  .finally(() => { prisma.$disconnect(); if (pool) pool.end(); });
