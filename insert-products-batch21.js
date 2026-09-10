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
// BATCH 21 — HKU Series (Fourth 5-Page Handwritten Audit Product Additions)
// Source: 5 Handwritten Audit Note Pages (September 11, 2026 Audit - Batch 21 Images)
// Covers: Tapes & Spanners (Ingco, Tolsen, Fixtec, Wellco, Dingqi, Emtop), Sockets,
//         Hole Saws, Dash Disinfectants, BNET2 Halogen Lamps, Water Heaters,
//         BS-40 Lubricant, Multico M-Fix Adhesives, Chemicals & Accessories
// ─────────────────────────────────────────────────────────────────────────────
const productsToInsert = [

  // ─── PAGE 1: TAPES & SPANNERS (INGCO, WELLCO, TOLSEN, FIXTEC) ─────────────
  { name: 'Ingco Steel Measuring Tape 10m', qty: 4, category: 'Hardware & Tools', subcategory: 'Measuring & Scales', brand: 'Ingco', price: 1250, unit: 'pcs' },
  { name: 'Ingco Steel Measuring Tape 5m', qty: 7, category: 'Hardware & Tools', subcategory: 'Measuring & Scales', brand: 'Ingco', price: 750, unit: 'pcs' },
  { name: 'Ingco Steel Measuring Tape 3m', qty: 1, category: 'Hardware & Tools', subcategory: 'Measuring & Scales', brand: 'Ingco', price: 550, unit: 'pcs' },
  { name: 'Ingco Combination Spanner 24mm', qty: 1, category: 'Hardware & Tools', subcategory: 'Hand Tools', brand: 'Ingco', price: 1450, unit: 'pcs' },
  { name: 'Ingco Combination Spanner 22mm', qty: 3, category: 'Hardware & Tools', subcategory: 'Hand Tools', brand: 'Ingco', price: 1250, unit: 'pcs' },
  { name: 'Ingco Combination Spanner 21mm', qty: 1, category: 'Hardware & Tools', subcategory: 'Hand Tools', brand: 'Ingco', price: 1150, unit: 'pcs' },
  { name: 'Huanan Chrome Rubberized Power Tape 7.5m', qty: 3, category: 'Hardware & Tools', subcategory: 'Measuring & Scales', brand: 'Huanan', price: 950, unit: 'pcs' },
  { name: 'Wellco Chrome Vanadium Combination Spanner 21mm', qty: 2, category: 'Hardware & Tools', subcategory: 'Hand Tools', brand: 'Wellco', price: 950, unit: 'pcs' },
  { name: 'Wellco Chrome Vanadium Combination Spanner 20mm', qty: 2, category: 'Hardware & Tools', subcategory: 'Hand Tools', brand: 'Wellco', price: 850, unit: 'pcs' },
  { name: 'Tolsen Double Ring Spanner 30x32mm (15882)', qty: 5, category: 'Hardware & Tools', subcategory: 'Hand Tools', brand: 'Tolsen', price: 2450, unit: 'pcs' },
  { name: 'Tolsen Double Ring Spanner 18x19mm (15882)', qty: 4, category: 'Hardware & Tools', subcategory: 'Hand Tools', brand: 'Tolsen', price: 1450, unit: 'pcs' },
  { name: 'Tolsen Double Ring Spanner 21x23mm (15882)', qty: 1, category: 'Hardware & Tools', subcategory: 'Hand Tools', brand: 'Tolsen', price: 1850, unit: 'pcs' },
  { name: 'Tolsen Combination Spanner 24mm', qty: 1, category: 'Hardware & Tools', subcategory: 'Hand Tools', brand: 'Tolsen', price: 1450, unit: 'pcs' },
  { name: 'Fixtec Combination Spanner 23mm', qty: 2, category: 'Hardware & Tools', subcategory: 'Hand Tools', brand: 'Fixtec', price: 1350, unit: 'pcs' },
  { name: 'Fixtec Combination Spanner 27mm', qty: 1, category: 'Hardware & Tools', subcategory: 'Hand Tools', brand: 'Fixtec', price: 1750, unit: 'pcs' },
  { name: 'Fixtec Combination Spanner 28mm', qty: 1, category: 'Hardware & Tools', subcategory: 'Hand Tools', brand: 'Fixtec', price: 1850, unit: 'pcs' },
  { name: 'Fixtec Combination Spanner 24mm', qty: 2, category: 'Hardware & Tools', subcategory: 'Hand Tools', brand: 'Fixtec', price: 1450, unit: 'pcs' },
  { name: 'Zhong Gong Combination Spanner 22mm', qty: 1, category: 'Hardware & Tools', subcategory: 'Hand Tools', brand: 'Zhong Gong', price: 950, unit: 'pcs' },
  { name: 'Wellco Combination Spanner 21mm', qty: 3, category: 'Hardware & Tools', subcategory: 'Hand Tools', brand: 'Wellco', price: 950, unit: 'pcs' },
  { name: 'Wellco Adjustable Spanner A-2', qty: 2, category: 'Hardware & Tools', subcategory: 'Hand Tools', brand: 'Wellco', price: 1650, unit: 'pcs' },
  { name: 'Qiamandi Combination Spanner 22mm', qty: 1, category: 'Hardware & Tools', subcategory: 'Hand Tools', brand: 'Qiamandi', price: 950, unit: 'pcs' },
  { name: 'Drop Forged Combination Spanner 22mm', qty: 1, category: 'Hardware & Tools', subcategory: 'Hand Tools', brand: 'Generic', price: 850, unit: 'pcs' },
  { name: 'Kevin Nylon Coated Measuring Tape 5m x 25mm', qty: 1, category: 'Hardware & Tools', subcategory: 'Measuring & Scales', brand: 'Kevin', price: 850, unit: 'pcs' },
  { name: 'Bin 3113 Combination Spanner 20mm', qty: 3, category: 'Hardware & Tools', subcategory: 'Hand Tools', brand: 'Generic', price: 850, unit: 'pcs' },
  { name: 'ShuanGong Combination Spanner 19mm', qty: 1, category: 'Hardware & Tools', subcategory: 'Hand Tools', brand: 'ShuanGong', price: 750, unit: 'pcs' },
  { name: 'Diamond Leopard Combination Spanner 19mm', qty: 1, category: 'Hardware & Tools', subcategory: 'Hand Tools', brand: 'Diamond Leopard', price: 750, unit: 'pcs' },
  { name: 'Jaguar King Combination Spanner 16mm', qty: 1, category: 'Hardware & Tools', subcategory: 'Hand Tools', brand: 'Jaguar King', price: 650, unit: 'pcs' },
  { name: '[FKK] Ingco Combination Spanner 15mm', qty: 6, category: 'Hardware & Tools', subcategory: 'Hand Tools', brand: 'Ingco', price: 650, unit: 'pcs' },

  // ─── PAGE 2: SPANNERS (DINGQI, INGCO, TOLSEN, EMTOP) & PLIERS ────────────
  { name: '[GFK] Dingqi Ratchet Combination Wrench 10mm', qty: 2, category: 'Hardware & Tools', subcategory: 'Hand Tools', brand: 'Dingqi', price: 1250, unit: 'pcs' },
  { name: '[GFK] Dingqi 1/2" Deep Socket 12mm', qty: 4, category: 'Hardware & Tools', subcategory: 'Hand Tools', brand: 'Dingqi', price: 650, unit: 'pcs' },
  { name: '[EKK] Ingco Combination Spanner 11mm', qty: 5, category: 'Hardware & Tools', subcategory: 'Hand Tools', brand: 'Ingco', price: 450, unit: 'pcs' },
  { name: '[EKK] Ingco Combination Spanner 16mm', qty: 3, category: 'Hardware & Tools', subcategory: 'Hand Tools', brand: 'Ingco', price: 650, unit: 'pcs' },
  { name: '[DCF] Ingco Combination Spanner 12mm', qty: 1, category: 'Hardware & Tools', subcategory: 'Hand Tools', brand: 'Ingco', price: 480, unit: 'pcs' },
  { name: '[DCF] Ingco Combination Spanner 20mm', qty: 2, category: 'Hardware & Tools', subcategory: 'Hand Tools', brand: 'Ingco', price: 850, unit: 'pcs' },
  { name: 'Ingco Combination Spanner 6mm', qty: 2, category: 'Hardware & Tools', subcategory: 'Hand Tools', brand: 'Ingco', price: 350, unit: 'pcs' },
  { name: 'Ingco Combination Spanner 9mm', qty: 6, category: 'Hardware & Tools', subcategory: 'Hand Tools', brand: 'Ingco', price: 420, unit: 'pcs' },
  { name: 'Mini Hacksaw Blade 150mm 6" (3 Packs + 7 Loose)', qty: 37, category: 'Hardware & Tools', subcategory: 'Hand Tools', brand: 'Generic', price: 85, unit: 'pcs' },
  { name: 'Arbor Hole Saw 9.5mm 3/8"', qty: 1, category: 'Hardware & Tools', subcategory: 'Power Tools Accessories', brand: 'Generic', price: 650, unit: 'pcs' },
  { name: '[HDCP08168] Ingco Diagonal Cutting Pliers 160mm 6"', qty: 3, category: 'Hardware & Tools', subcategory: 'Hand Tools', brand: 'Ingco', price: 1450, unit: 'pcs' },
  { name: 'Tolsen Combination Spanner 12mm', qty: 3, category: 'Hardware & Tools', subcategory: 'Hand Tools', brand: 'Tolsen', price: 550, unit: 'pcs' },
  { name: 'Tolsen Combination Spanner 14mm', qty: 1, category: 'Hardware & Tools', subcategory: 'Hand Tools', brand: 'Tolsen', price: 650, unit: 'pcs' },
  { name: 'Tolsen Combination Spanner 11mm', qty: 3, category: 'Hardware & Tools', subcategory: 'Hand Tools', brand: 'Tolsen', price: 480, unit: 'pcs' },
  { name: 'Tolsen Combination Spanner 26mm', qty: 1, category: 'Hardware & Tools', subcategory: 'Hand Tools', brand: 'Tolsen', price: 1650, unit: 'pcs' },
  { name: 'Tolsen Double Ring Spanner 14x15mm', qty: 1, category: 'Hardware & Tools', subcategory: 'Hand Tools', brand: 'Tolsen', price: 1250, unit: 'pcs' },
  { name: 'Tolsen Double Ring Spanner 16x17mm', qty: 1, category: 'Hardware & Tools', subcategory: 'Hand Tools', brand: 'Tolsen', price: 1350, unit: 'pcs' },
  { name: 'Tolsen 1/2" Deep Socket 13mm', qty: 3, category: 'Hardware & Tools', subcategory: 'Hand Tools', brand: 'Tolsen', price: 650, unit: 'pcs' },
  { name: 'Tolsen 1/2" Deep Socket 16mm', qty: 1, category: 'Hardware & Tools', subcategory: 'Hand Tools', brand: 'Tolsen', price: 750, unit: 'pcs' },
  { name: 'Drop Forged Combination Spanner 12mm', qty: 3, category: 'Hardware & Tools', subcategory: 'Hand Tools', brand: 'Generic', price: 450, unit: 'pcs' },
  { name: 'Drop Forged Combination Spanner 10mm', qty: 1, category: 'Hardware & Tools', subcategory: 'Hand Tools', brand: 'Generic', price: 380, unit: 'pcs' },
  { name: 'EMTOP Ratchet Combination Spanner 12mm', qty: 3, category: 'Hardware & Tools', subcategory: 'Hand Tools', brand: 'EMTOP', price: 1450, unit: 'pcs' },
  { name: 'EMTOP Ratchet Combination Spanner 10mm', qty: 1, category: 'Hardware & Tools', subcategory: 'Hand Tools', brand: 'EMTOP', price: 1350, unit: 'pcs' },
  { name: 'Qiamandi Combination Spanner 9mm', qty: 2, category: 'Hardware & Tools', subcategory: 'Hand Tools', brand: 'Qiamandi', price: 420, unit: 'pcs' },
  { name: 'Jaguar King Combination Spanner 9mm', qty: 2, category: 'Hardware & Tools', subcategory: 'Hand Tools', brand: 'Jaguar King', price: 420, unit: 'pcs' },
  { name: 'DBL Combination Spanner 21mm', qty: 1, category: 'Hardware & Tools', subcategory: 'Hand Tools', brand: 'DBL', price: 950, unit: 'pcs' },
  { name: 'DBL Combination Spanner 20mm', qty: 1, category: 'Hardware & Tools', subcategory: 'Hand Tools', brand: 'DBL', price: 850, unit: 'pcs' },

  // ─── PAGE 3: FIXTEC, BESTOOL, INGCO SOCKETS & COUPLERS ───────────────────
  { name: 'Fixtec Combination Spanner 25mm', qty: 2, category: 'Hardware & Tools', subcategory: 'Hand Tools', brand: 'Fixtec', price: 1550, unit: 'pcs' },
  { name: 'Fixtec Combination Spanner 26mm', qty: 2, category: 'Hardware & Tools', subcategory: 'Hand Tools', brand: 'Fixtec', price: 1650, unit: 'pcs' },
  { name: 'Fixtec Combination Spanner 28mm', qty: 1, category: 'Hardware & Tools', subcategory: 'Hand Tools', brand: 'Fixtec', price: 1850, unit: 'pcs' },
  { name: '[Tieshou] 1/2" Roberts Ratchet Handle', qty: 1, category: 'Hardware & Tools', subcategory: 'Hand Tools', brand: 'Tieshou', price: 2450, unit: 'pcs' },
  { name: '[HFK] Anana Soccer Screw', qty: 3, category: 'Building Materials', subcategory: 'Fasteners & Screws', brand: 'Generic', price: 250, unit: 'pcs' },
  { name: '[ZHWEI] TCT Wood Hole Saw 20mm', qty: 6, category: 'Hardware & Tools', subcategory: 'Power Tools Accessories', brand: 'ZHWEI', price: 750, unit: 'pcs' },
  { name: '[Deli] Mini Saws 150mm 6" DL6007', qty: 2, category: 'Hardware & Tools', subcategory: 'Hand Tools', brand: 'Deli', price: 850, unit: 'pcs' },
  { name: 'Collins Combination Spanner 20mm', qty: 1, category: 'Hardware & Tools', subcategory: 'Hand Tools', brand: 'Collins', price: 850, unit: 'pcs' },
  { name: 'Bestool Combination Spanner 20mm', qty: 1, category: 'Hardware & Tools', subcategory: 'Hand Tools', brand: 'Bestool', price: 850, unit: 'pcs' },
  { name: 'Bestool Combination Spanner 25mm', qty: 1, category: 'Hardware & Tools', subcategory: 'Hand Tools', brand: 'Bestool', price: 1450, unit: 'pcs' },
  { name: 'Bestool Combination Spanner 8mm', qty: 7, category: 'Hardware & Tools', subcategory: 'Hand Tools', brand: 'Bestool', price: 380, unit: 'pcs' },
  { name: 'Bestool Combination Spanner 6mm', qty: 4, category: 'Hardware & Tools', subcategory: 'Hand Tools', brand: 'Bestool', price: 320, unit: 'pcs' },
  { name: '3R Quick Coupler 6Pcs Pack', qty: 2, category: 'Hardware & Tools', subcategory: 'Pneumatic Tools', brand: '3R', price: 1450, unit: 'pack' },
  { name: '[CFK] HuaHuai Spark Plug Removal Spanner Double Ended', qty: 1, category: 'Hardware & Tools', subcategory: 'Hand Tools', brand: 'HuaHuai', price: 1250, unit: 'pcs' },
  { name: 'Ingco 1/2" Hexagonal Socket 30mm', qty: 1, category: 'Hardware & Tools', subcategory: 'Hand Tools', brand: 'Ingco', price: 850, unit: 'pcs' },
  { name: 'Ingco 1/2" Hexagonal Socket 32mm', qty: 3, category: 'Hardware & Tools', subcategory: 'Hand Tools', brand: 'Ingco', price: 950, unit: 'pcs' },
  { name: 'Ingco 1/2" Hexagonal Socket 29mm', qty: 1, category: 'Hardware & Tools', subcategory: 'Hand Tools', brand: 'Ingco', price: 850, unit: 'pcs' },
  { name: 'Ingco 1/2" Hexagonal Socket 9mm', qty: 2, category: 'Hardware & Tools', subcategory: 'Hand Tools', brand: 'Ingco', price: 450, unit: 'pcs' },
  { name: 'Ingco 1/2" Hexagonal Socket 15mm', qty: 1, category: 'Hardware & Tools', subcategory: 'Hand Tools', brand: 'Ingco', price: 550, unit: 'pcs' },
  { name: 'Square to Hex Adapter 2" 50mm', qty: 1, category: 'Hardware & Tools', subcategory: 'Power Tools Accessories', brand: 'Generic', price: 650, unit: 'pcs' },

  // ─── PAGE 4: DASH DISINFECTANTS ───────────────────────────────────────────
  { name: 'Dash Disinfectant Lavender 1L', qty: 12, category: 'Chemicals & Cleaners', subcategory: 'Disinfectants', brand: 'Dash', price: 650, unit: 'bottle' },
  { name: 'Dash Disinfectant Pinetop-02 1L', qty: 8, category: 'Chemicals & Cleaners', subcategory: 'Disinfectants', brand: 'Dash', price: 650, unit: 'bottle' },

  // ─── PAGE 5: HALOGEN LAMPS, HEATERS, BS-40, M-FIX, INSECTICIDES & CLEANERS
  { name: '[BNET2] Halogen Lamp 1000W', qty: 6, category: 'Lighting & Electrical', subcategory: 'Outdoor Lamps', brand: 'BNET2', price: 1450, unit: 'pcs' },
  { name: '[BNET2] Halogen Lamp 500W', qty: 3, category: 'Lighting & Electrical', subcategory: 'Outdoor Lamps', brand: 'BNET2', price: 950, unit: 'pcs' },
  { name: '[NC Technics] Immersion Water Heater 1500W', qty: 2, category: 'Home Appliances', subcategory: 'Water Heaters', brand: 'NC Technics', price: 2450, unit: 'pcs' },
  { name: '[BS-40] Rust Removal Lubricant 400ml', qty: 6, category: 'Chemicals & Cleaners', subcategory: 'Lubricants & Sprays', brand: 'BS-40', price: 1250, unit: 'can' },
  { name: 'LED Controller 1500W', qty: 6, category: 'Lighting & Electrical', subcategory: 'Sensors & Automation', brand: 'Generic', price: 2850, unit: 'pcs' },
  { name: 'Magic Epoxy Star Mender-Filler', qty: 24, category: 'Chemicals & Cleaners', subcategory: 'Adhesives & Sealants', brand: 'Magic Epoxy Star', price: 350, unit: 'pcs' },
  { name: '[Luta] Isobutylene-Isoprene Rubber', qty: 8, category: 'Chemicals & Cleaners', subcategory: 'Adhesives & Sealants', brand: 'Luta', price: 450, unit: 'pcs' },
  { name: 'Long Type Step Light 3W 3000k Black Body', qty: 6, category: 'Lighting & Electrical', subcategory: 'Outdoor Lamps', brand: 'Generic', price: 1450, unit: 'pcs' },
  { name: 'Float Valve 1/2"', qty: 1, category: 'Plumbing & Sanitaryware', subcategory: 'Valves & Fittings', brand: 'Generic', price: 850, unit: 'pcs' },
  { name: 'Float Switch Fluid Level Controller 1.5m', qty: 1, category: 'Lighting & Electrical', subcategory: 'Sensors & Automation', brand: 'Generic', price: 1850, unit: 'pcs' },
  { name: 'Multico M-Fix Adhesive 100g', qty: 21, category: 'Chemicals & Cleaners', subcategory: 'Adhesives & Sealants', brand: 'Multico', price: 380, unit: 'pcs' },
  { name: 'Multico M-Fix Adhesive 250g', qty: 12, category: 'Chemicals & Cleaners', subcategory: 'Adhesives & Sealants', brand: 'Multico', price: 750, unit: 'pcs' },
  { name: 'Multico M-Fix Adhesive 50g', qty: 19, category: 'Chemicals & Cleaners', subcategory: 'Adhesives & Sealants', brand: 'Multico', price: 250, unit: 'pcs' },
  { name: 'Nail Gun Nails 100Pcs Boxes (2 Boxes + Loose 43)', qty: 243, category: 'Hardware & Tools', subcategory: 'Fasteners & Screws', brand: 'Generic', price: 15, unit: 'pcs' },
  { name: 'Mortein Fast Kill Insecticide Spray 250ml', qty: 10, category: 'Chemicals & Cleaners', subcategory: 'Insecticides', brand: 'Mortein', price: 650, unit: 'can' },
  { name: '[Qidaria] Tile Reform Grout Sealer 150ml', qty: 3, category: 'Chemicals & Cleaners', subcategory: 'Adhesives & Sealants', brand: 'Qidaria', price: 850, unit: 'bottle' },
  { name: 'Harpic and Lysol Cleaner Set', qty: 2, category: 'Chemicals & Cleaners', subcategory: 'Disinfectants', brand: 'Harpic', price: 950, unit: 'set' },
];

async function insertProductsBatch21() {
  console.log('🚀 Starting Batch 21 Product Insertion & Smart Stock Upsert...\n');

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
  console.log(`✅ Using Warehouse: ${warehouse.name} (${warehouse.id})\n`);

  const allExisting = await prisma.product.findMany({
    where: { tenantId: shop.id },
    select: { id: true, name: true, sku: true },
  });

  const existingByName = new Map();
  const existingByModelCode = new Map();
  let maxHkuNum = 0;

  allExisting.forEach(p => {
    existingByName.set(p.name.toLowerCase().trim(), p);

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
  console.log(`📦 HKU sequence continuing automatically from: HKU_${String(hkuIndex).padStart(2, '0')}\n`);

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
    let existingProd = existingByName.get(item.name.toLowerCase().trim());

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
      console.log(`[STOCK+] ${(existingProd.sku || 'EXISTS').padEnd(8)} | +${String(item.qty).padStart(3)} | ${existingProd.name} (Matched for: ${item.name})`);
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

      existingByName.set(item.name.toLowerCase().trim(), product);
      insertedCount++;
      console.log(`[NEW]    ${hkuCode.padEnd(8)} | Qty: ${String(item.qty).padStart(3)} | Rs. ${String(item.price).padStart(5)} | ${item.name}`);
    }
  }

  console.log(`\n==============================================`);
  console.log(`✅ BATCH 21 COMPLETE!`);
  console.log(`✨ New Products Created: ${insertedCount}`);
  console.log(`🔄 Existing Products Stock Added: ${updatedCount}`);
  console.log(`🏷️ HKU Series now at: HKU_${String(hkuIndex - 1).padStart(2, '0')}`);
  console.log(`==============================================\n`);
}

insertProductsBatch21()
  .catch(e => {
    console.error('❌ Error executing Batch 21:', e);
    process.exit(1);
  })
  .finally(async () => {
    if (prisma) await prisma.$disconnect();
    if (pool) await pool.end();
  });
