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
// BATCH 6 — HKU Series (New numbering scheme starting HKU_01)
// Adhesives, Fasteners, Construction, Safety PPE, Painting Tools
// NOTE: Paints (Multilac, Berlux, Nippon) already inserted in Batch 4.
//       Only genuinely NEW products are listed here.
// ─────────────────────────────────────────────────────────────────────────────
const productsToInsert = [

  // ─── PAINTS & COATINGS — New items NOT in Batch 4 ────────────────────────
  // NOTE: Using category 'Paint' (not 'Paints') to match existing Batch 4 DB category
  { name: 'Berlux Floor Paint White 4L',        qty: 2,  category: 'Paint',      subcategory: 'Floor Paint',       brand: 'Berlux',    price: 7600,   unit: 'Liters' },
  { name: 'Berlux Floor Paint Red Oxide 4L',    qty: 2,  category: 'Paint',      subcategory: 'Floor Paint',       brand: 'Berlux',    price: 7600,   unit: 'Liters' },
  { name: 'Jotun Strax Gloss White 4L',         qty: 2,  category: 'Paint',      subcategory: 'Gloss Paint',       brand: 'Jotun',     price: 8200,   unit: 'Liters' },
  { name: 'Jotun Jotashield Exterior 4L',       qty: 2,  category: 'Paint',      subcategory: 'Exterior Paint',    brand: 'Jotun',     price: 9500,   unit: 'Liters' },
  { name: 'Red Oxide Primer 1L',               qty: 10, category: 'Paint',      subcategory: 'Primer & Sealer',   brand: 'Generic',   price: 780,    unit: 'Liters' },
  { name: 'White Cement 50kg',                 qty: 20, category: 'Building Materials', subcategory: 'Cement & Mortar', brand: 'Holcim', price: 1800, unit: 'Kilograms' },

  // ─── ADHESIVES & SEALANTS ─────────────────────────────────────────────────
  { name: 'Silicone Sealant White 300ml',       qty: 20, category: 'Hardware',   subcategory: 'Adhesives',         brand: 'Generic',   price: 420,    unit: 'tube' },
  { name: 'Silicone Sealant Clear 300ml',       qty: 20, category: 'Hardware',   subcategory: 'Adhesives',         brand: 'Generic',   price: 420,    unit: 'tube' },
  { name: 'Epoxy Adhesive 2-Part 50ml',         qty: 12, category: 'Hardware',   subcategory: 'Adhesives',         brand: 'Araldite',  price: 350,    unit: 'set' },
  { name: 'PVC Solvent Cement 1L',              qty: 10, category: 'Plumbing',   subcategory: 'Pipe Accessories',  brand: 'Generic',   price: 650,    unit: 'tin' },
  { name: 'PVC Solvent Cement 500ml',           qty: 20, category: 'Plumbing',   subcategory: 'Pipe Accessories',  brand: 'Generic',   price: 380,    unit: 'tin' },
  { name: 'Tile Adhesive 20kg',                qty: 30, category: 'Hardware',   subcategory: 'Adhesives',         brand: 'Mapei',     price: 1650,   unit: 'bag' },
  { name: 'Construction Bond 1L',              qty: 12, category: 'Hardware',   subcategory: 'Adhesives',         brand: 'Generic',   price: 580,    unit: 'tin' },
  { name: 'Teflon Tape Roll',                  qty: 100,category: 'Plumbing',   subcategory: 'Pipe Accessories',  brand: 'Generic',   price: 45,     unit: 'roll' },

  // ─── FASTENERS & FIXINGS ──────────────────────────────────────────────────
  { name: 'Rawl Bolt M8 × 60mm (50pcs)',       qty: 10, category: 'Hardware',   subcategory: 'Fasteners',         brand: 'Generic',   price: 480,    unit: 'box' },
  { name: 'Rawl Bolt M10 × 80mm (50pcs)',      qty: 8,  category: 'Hardware',   subcategory: 'Fasteners',         brand: 'Generic',   price: 620,    unit: 'box' },
  { name: 'Wood Screw 2 inch (500pcs)',         qty: 10, category: 'Hardware',   subcategory: 'Fasteners',         brand: 'Generic',   price: 380,    unit: 'box' },
  { name: 'Wood Screw 3 inch (200pcs)',         qty: 10, category: 'Hardware',   subcategory: 'Fasteners',         brand: 'Generic',   price: 420,    unit: 'box' },
  { name: 'Self Drilling Screw 1 inch (500pcs)',qty: 8,  category: 'Hardware',   subcategory: 'Fasteners',         brand: 'Generic',   price: 350,    unit: 'box' },
  { name: 'Nut & Bolt M6 Set (100pcs)',         qty: 15, category: 'Hardware',   subcategory: 'Fasteners',         brand: 'Generic',   price: 280,    unit: 'box' },
  { name: 'Wall Anchor 8mm (100pcs)',           qty: 20, category: 'Hardware',   subcategory: 'Fasteners',         brand: 'Generic',   price: 220,    unit: 'box' },
  { name: 'Galvanised Nail 3 inch (1kg)',       qty: 20, category: 'Hardware',   subcategory: 'Fasteners',         brand: 'Generic',   price: 320,    unit: 'kg' },
  { name: 'Galvanised Nail 4 inch (1kg)',       qty: 15, category: 'Hardware',   subcategory: 'Fasteners',         brand: 'Generic',   price: 340,    unit: 'kg' },
  { name: 'Concrete Nail 3 inch (100pcs)',      qty: 10, category: 'Hardware',   subcategory: 'Fasteners',         brand: 'Generic',   price: 185,    unit: 'box' },

  // ─── CONSTRUCTION & CIVIL ─────────────────────────────────────────────────
  { name: 'Steel Rod 10mm (12m)',               qty: 50, category: 'Construction',subcategory: 'Steel & Metal',    brand: 'Generic',   price: 3800,   unit: 'rod' },
  { name: 'Steel Rod 12mm (12m)',               qty: 30, category: 'Construction',subcategory: 'Steel & Metal',    brand: 'Generic',   price: 5200,   unit: 'rod' },
  { name: 'Steel Rod 8mm (12m)',                qty: 20, category: 'Construction',subcategory: 'Steel & Metal',    brand: 'Generic',   price: 2600,   unit: 'rod' },
  { name: 'GI Wire 16G (1kg)',                  qty: 30, category: 'Hardware',   subcategory: 'Wires & Mesh',      brand: 'Generic',   price: 480,    unit: 'kg' },
  { name: 'GI Wire Mesh 6mm × 6mm (1mx2m)',    qty: 10, category: 'Hardware',   subcategory: 'Wires & Mesh',      brand: 'Generic',   price: 2800,   unit: 'sheet' },
  { name: 'Binding Wire (1kg)',                 qty: 20, category: 'Hardware',   subcategory: 'Wires & Mesh',      brand: 'Generic',   price: 380,    unit: 'kg' },
  { name: 'Polythene Sheet (4m wide roll)',     qty: 5,  category: 'Construction',subcategory: 'Waterproofing',    brand: 'Generic',   price: 2200,   unit: 'roll' },
  { name: 'Sand Paper 100 Grit (10pcs)',        qty: 10, category: 'Tools',      subcategory: 'Hand Tools',        brand: 'Generic',   price: 180,    unit: 'pack' },
  { name: 'Sand Paper 40 Grit (10pcs)',         qty: 10, category: 'Tools',      subcategory: 'Hand Tools',        brand: 'Generic',   price: 180,    unit: 'pack' },

  // ─── SAFETY & PPE ────────────────────────────────────────────────────────
  { name: 'Safety Helmet (White)',              qty: 10, category: 'Safety',     subcategory: 'PPE',               brand: 'Generic',   price: 850,    unit: 'pcs' },
  { name: 'Safety Gloves (Leather)',            qty: 20, category: 'Safety',     subcategory: 'PPE',               brand: 'Generic',   price: 380,    unit: 'pair' },
  { name: 'Safety Boots Size 42',              qty: 5,  category: 'Safety',     subcategory: 'PPE',               brand: 'Generic',   price: 2800,   unit: 'pair' },
  { name: 'Safety Goggles (Clear)',             qty: 15, category: 'Safety',     subcategory: 'PPE',               brand: 'Generic',   price: 480,    unit: 'pcs' },
  { name: 'Dust Mask N95 (10pcs)',              qty: 10, category: 'Safety',     subcategory: 'PPE',               brand: 'Generic',   price: 320,    unit: 'box' },
  { name: 'Reflective Safety Vest',            qty: 10, category: 'Safety',     subcategory: 'PPE',               brand: 'Generic',   price: 580,    unit: 'pcs' },

  // ─── HAND TOOLS ─────────────────────────────────────────────────────────
  { name: 'Paint Brush 2 inch',               qty: 20, category: 'Tools',      subcategory: 'Painting Tools',    brand: 'Generic',   price: 180,    unit: 'pcs' },
  { name: 'Paint Brush 4 inch',               qty: 15, category: 'Tools',      subcategory: 'Painting Tools',    brand: 'Generic',   price: 280,    unit: 'pcs' },
  { name: 'Paint Roller 9 inch + Tray',        qty: 10, category: 'Tools',      subcategory: 'Painting Tools',    brand: 'Generic',   price: 480,    unit: 'set' },
  { name: 'Paint Roller Refill 9 inch',        qty: 20, category: 'Tools',      subcategory: 'Painting Tools',    brand: 'Generic',   price: 220,    unit: 'pcs' },
  { name: 'Putty Knife 4 inch',               qty: 12, category: 'Tools',      subcategory: 'Painting Tools',    brand: 'Generic',   price: 280,    unit: 'pcs' },
  { name: 'Masking Tape 1 inch (40m)',         qty: 30, category: 'Tools',      subcategory: 'Painting Tools',    brand: 'Generic',   price: 95,     unit: 'roll' },
  { name: 'Masking Tape 2 inch (40m)',         qty: 20, category: 'Tools',      subcategory: 'Painting Tools',    brand: 'Generic',   price: 185,    unit: 'roll' },
  { name: 'Steel Brush 4 Row',                qty: 15, category: 'Tools',      subcategory: 'Hand Tools',        brand: 'Generic',   price: 220,    unit: 'pcs' },
  { name: 'Hacksaw Frame with Blade',         qty: 8,  category: 'Tools',      subcategory: 'Hand Tools',        brand: 'Generic',   price: 650,    unit: 'pcs' },
  { name: 'Hacksaw Blades (10pcs)',            qty: 10, category: 'Tools',      subcategory: 'Hand Tools',        brand: 'Generic',   price: 280,    unit: 'pack' },
  { name: 'Spirit Level 60cm',               qty: 5,  category: 'Tools',      subcategory: 'Measuring Tools',   brand: 'Generic',   price: 980,    unit: 'pcs' },
  { name: 'Tape Measure 5m',                 qty: 10, category: 'Tools',      subcategory: 'Measuring Tools',   brand: 'Generic',   price: 380,    unit: 'pcs' },
  { name: 'Plumb Bob 200g',                   qty: 8,  category: 'Tools',      subcategory: 'Measuring Tools',   brand: 'Generic',   price: 280,    unit: 'pcs' },
];

async function insertProductsBatch6() {
  console.log('🚀 Starting Batch 6 — HKU Series Product Insertion...');

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

  // Fetch all existing products
  const allExisting = await prisma.product.findMany({
    where: { tenantId: shop.id },
    select: { id: true, name: true, sku: true },
  });

  const existingByName = new Map();
  let maxHkuNum = 0;

  allExisting.forEach(p => {
    existingByName.set(p.name.toLowerCase(), p);
    // Track existing HKU numbers
    const hkuMatch = p.sku && p.sku.match(/HKU_(\d+)/i);
    if (hkuMatch) {
      const num = parseInt(hkuMatch[1], 10);
      if (num > maxHkuNum) maxHkuNum = num;
    }
  });

  let hkuIndex = maxHkuNum + 1;
  console.log(`📦 Starting HKU sequence from HKU_${String(hkuIndex).padStart(2, '0')}`);

  // Caches
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
      // Product exists → update stock
      const stock = await prisma.stock.findFirst({
        where: { tenantId: shop.id, productId: existingProd.id, warehouseId: warehouse.id },
      });

      if (stock) {
        await prisma.stock.update({
          where: { id: stock.id },
          data: {
            quantity: { increment: item.qty },
            availableQuantity: { increment: item.qty },
          },
        });
      } else {
        await prisma.stock.create({
          data: {
            tenantId: shop.id,
            productId: existingProd.id,
            warehouseId: warehouse.id,
            branchId: branchId,
            quantity: item.qty,
            availableQuantity: item.qty,
          },
        });
      }
      updatedCount++;
      console.log(`[STOCK+] ${existingProd.sku} | ${item.name} → +${item.qty} ${item.unit}`);

    } else {
      // New product → create category, brand, product, stock
      let cat = catCache.get(item.category.toLowerCase());
      if (!cat) {
        cat = await prisma.category.create({
          data: { tenantId: shop.id, name: item.category },
        });
        catCache.set(item.category.toLowerCase(), cat);
      }

      const subKey = `${item.category}:${item.subcategory}`.toLowerCase();
      let subCat = subCatCache.get(subKey);
      if (!subCat) {
        const existingSub = existingCats.find(
          c => c.name.toLowerCase() === item.subcategory.toLowerCase() && c.parentId === cat.id
        );
        if (existingSub) {
          subCat = existingSub;
        } else {
          subCat = await prisma.category.create({
            data: { tenantId: shop.id, name: item.subcategory, parentId: cat.id },
          });
        }
        subCatCache.set(subKey, subCat);
      }

      let brand = null;
      if (item.brand && item.brand !== 'Generic') {
        brand = brandCache.get(item.brand.toLowerCase());
        if (!brand) {
          brand = await prisma.brand.create({
            data: { tenantId: shop.id, name: item.brand, categoryId: cat.id },
          });
          brandCache.set(item.brand.toLowerCase(), brand);
        }
      }

      // HKU_01, HKU_02, ... (2-digit padding, or more if needed)
      const hkuCode = `HKU_${String(hkuIndex).padStart(2, '0')}`;
      const barcode  = `30000${String(hkuIndex).padStart(5, '0')}`;
      hkuIndex++;

      const product = await prisma.product.create({
        data: {
          tenantId: shop.id,
          name: item.name,
          sku: hkuCode,
          barcode: barcode,
          categoryId: cat.id,
          subcategoryId: subCat?.id || null,
          brandId: brand?.id || null,
          sellingPrice: item.price,
          purchasePrice: Math.round(item.price * 0.72),
          minimumStockLevel: 3,
          sellType: 'FIX',
          measurementUnit: item.unit || 'pcs',
        },
      });

      await prisma.stock.create({
        data: {
          tenantId: shop.id,
          productId: product.id,
          warehouseId: warehouse.id,
          branchId: branchId,
          quantity: item.qty,
          availableQuantity: item.qty,
          reservedQuantity: 0,
          damagedQuantity: 0,
        },
      });

      insertedCount++;
      console.log(`[NEW] ${hkuCode} | ${item.name} | Qty:${item.qty} ${item.unit} | Rs.${item.price.toLocaleString()} | ${item.category} > ${item.subcategory}`);
    }
  }

  console.log(`\n🎉 BATCH 6 COMPLETE!`);
  console.log(`   ✅ New Products Inserted : ${insertedCount}`);
  console.log(`   🔄 Existing Stock Updated: ${updatedCount}`);
  console.log(`   📋 HKU series now at     : HKU_${String(hkuIndex - 1).padStart(2, '0')}`);
}

insertProductsBatch6()
  .catch(e => {
    console.error('❌ Error:', e.message);
    process.exit(1);
  })
  .finally(() => {
    prisma.$disconnect();
    if (pool) pool.end();
  });
