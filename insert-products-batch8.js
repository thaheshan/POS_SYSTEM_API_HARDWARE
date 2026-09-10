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
// BATCH 8 — HKU Series (Auto-continues from last HKU number in DB)
// Source: Handwritten stock audit pages (Wood Stains, Gums, Valves & Paints)
// ─────────────────────────────────────────────────────────────────────────────
const productsToInsert = [

  // ─── 1. WOOD STAINS & COATINGS ─────────────────────────────────────────────
  { name: 'Masters WB Pre Wood Stain Walnut 1L',            qty: 13, category: 'Paints',    subcategory: 'Wood Stains',       brand: 'Masters',        price: 2800, unit: '1L' },
  { name: 'Masters Ceiling Coat Teak 1L',                   qty: 6,  category: 'Paints',    subcategory: 'Wood Stains',       brand: 'Masters',        price: 2600, unit: '1L' },
  { name: 'Sayerlack WB Pre Exterior Wood Stain Mahogany 1L', qty: 14, category: 'Paints',  subcategory: 'Wood Stains',       brand: 'Sayerlack',      price: 3800, unit: '1L' },
  { name: 'Sayerlack WB Pre Exterior Wood Stain Mahogany 500ml', qty: 12, category: 'Paints', subcategory: 'Wood Stains',    brand: 'Sayerlack',      price: 2100, unit: '500ml' },
  { name: 'Sayerlack WB Exterior Topcoat 60% Gloss 500ml',  qty: 8,  category: 'Paints',    subcategory: 'Wood Stains',       brand: 'Sayerlack',      price: 2400, unit: '500ml' },

  // ─── 2. DULUX WOOD GUARD & STAINS ──────────────────────────────────────────
  { name: 'Dulux DNDT Ext Deck WB Pro Dark Pali 1L',        qty: 6,  category: 'Paints',    subcategory: 'Wood Guard',        brand: 'Dulux',          price: 3400, unit: '1L' },
  { name: 'Dulux Wood Guard Teak 1L',                       qty: 1,  category: 'Paints',    subcategory: 'Wood Guard',        brand: 'Dulux',          price: 3200, unit: '1L' },
  { name: 'Dulux Wood Guard Burma Teak 1L',                 qty: 9,  category: 'Paints',    subcategory: 'Wood Guard',        brand: 'Dulux',          price: 3200, unit: '1L' },
  { name: 'Dulux Wood Guard Dark African Walnut 1L',        qty: 8,  category: 'Paints',    subcategory: 'Wood Guard',        brand: 'Dulux',          price: 3400, unit: '1L' },
  { name: 'Dulux Water Based Stain Teak 500ml',            qty: 2,  category: 'Paints',    subcategory: 'Wood Guard',        brand: 'Dulux',          price: 1800, unit: '500ml' },
  { name: 'Dulux Pre Wood Stain Burma Teak 500ml',         qty: 18, category: 'Paints',    subcategory: 'Wood Guard',        brand: 'Dulux',          price: 1800, unit: '500ml' },

  // ─── 3. ADHESIVES & GUMS ───────────────────────────────────────────────────
  { name: 'National PVC Gum 500g',                          qty: 3,  category: 'Plumbing',  subcategory: 'Adhesives & Solvents', brand: 'National',    price: 1350, unit: '500g' },
  { name: 'National PVC Gum 250g',                          qty: 23, category: 'Plumbing',  subcategory: 'Adhesives & Solvents', brand: 'National',    price: 715,  unit: '250g' },
  { name: 'National PVC Gum 100g',                          qty: 68, category: 'Plumbing',  subcategory: 'Adhesives & Solvents', brand: 'National',    price: 395,  unit: '100g' },
  { name: 'National PVC Gum 50g',                           qty: 83, category: 'Plumbing',  subcategory: 'Adhesives & Solvents', brand: 'National',    price: 220,  unit: '50g' },
  { name: 'Suretite Hot Water Gum 118g',                    qty: 1,  category: 'Plumbing',  subcategory: 'Adhesives & Solvents', brand: 'Suretite',    price: 160,  unit: '118g' },
  { name: 'National PVC Gum 15g',                           qty: 46, category: 'Plumbing',  subcategory: 'Adhesives & Solvents', brand: 'National',    price: 200,  unit: '15g' },
  { name: 'S-Lon PVC Gum 25g',                              qty: 57, category: 'Plumbing',  subcategory: 'Adhesives & Solvents', brand: 'S-Lon',       price: 240,  unit: '25g' },

  // ─── 4. VALVES & BRASS FITTINGS ───────────────────────────────────────────
  { name: 'WaterTec Lever Type Ball Valve 1 1/2"',          qty: 9,  category: 'Plumbing',  subcategory: 'Valves',            brand: 'WaterTec',       price: 1850, unit: 'pcs' },
  { name: 'WaterTec Lever Type Ball Valve 1 1/4"',          qty: 5,  category: 'Plumbing',  subcategory: 'Valves',            brand: 'WaterTec',       price: 1650, unit: 'pcs' },
  { name: 'WaterTec Ball Valve 3/4"',                       qty: 2,  category: 'Plumbing',  subcategory: 'Valves',            brand: 'WaterTec',       price: 950,  unit: 'pcs' },
  { name: 'WaterTec Non-Threaded Ball Valve 1"',            qty: 1,  category: 'Plumbing',  subcategory: 'Valves',            brand: 'WaterTec',       price: 1100, unit: 'pcs' },
  { name: 'Arpico Super Ball Valve 1 1/2"',                 qty: 4,  category: 'Plumbing',  subcategory: 'Valves',            brand: 'Arpico',         price: 1750, unit: 'pcs' },
  { name: 'Arpico Super Ball Valve 1"',                     qty: 8,  category: 'Plumbing',  subcategory: 'Valves',            brand: 'Arpico',         price: 1250, unit: 'pcs' },
  { name: 'Fordmix Brass Stop Valve 2"',                    qty: 4,  category: 'Plumbing',  subcategory: 'Valves',            brand: 'Fordmix',        price: 3800, unit: 'pcs' },
  { name: 'Fordmix Brass Stop Valve 1 1/2"',                qty: 4,  category: 'Plumbing',  subcategory: 'Valves',            brand: 'Fordmix',        price: 3200, unit: 'pcs' },
  { name: 'Fordmix Brass Stop Valve 1"',                    qty: 13, category: 'Plumbing',  subcategory: 'Valves',            brand: 'Fordmix',        price: 2400, unit: 'pcs' },
  { name: 'Fordmix Brass Stop Valve 3/4"',                  qty: 1,  category: 'Plumbing',  subcategory: 'Valves',            brand: 'Fordmix',        price: 1850, unit: 'pcs' },
  { name: 'Fordmix Brass Stop Valve 1/2"',                  qty: 2,  category: 'Plumbing',  subcategory: 'Valves',            brand: 'Fordmix',        price: 1450, unit: 'pcs' },
  { name: 'Kevin Brass Stop Valve 3/4"',                    qty: 10, category: 'Plumbing',  subcategory: 'Valves',            brand: 'Kevin',          price: 1800, unit: 'pcs' },
  { name: 'Omson Brass Stop Valve 1/2"',                    qty: 4,  category: 'Plumbing',  subcategory: 'Valves',            brand: 'Omson',          price: 1400, unit: 'pcs' },
  { name: 'Omson Forged Ball Valve 1/2"',                   qty: 8,  category: 'Plumbing',  subcategory: 'Valves',            brand: 'Omson',          price: 1350, unit: 'pcs' },
  { name: 'Straina Brass Stop Valve 1"',                    qty: 2,  category: 'Plumbing',  subcategory: 'Valves',            brand: 'Straina',        price: 2300, unit: 'pcs' },
  { name: 'Veuls Italy Brass Stop Valve 1"',                qty: 3,  category: 'Plumbing',  subcategory: 'Valves',            brand: 'Veuls Italy',    price: 2600, unit: 'pcs' },
  { name: 'Veuls Italy Brass Stop Valve 3/4"',              qty: 4,  category: 'Plumbing',  subcategory: 'Valves',            brand: 'Veuls Italy',    price: 2100, unit: 'pcs' },
  { name: 'Veuls Italy Brass Stop Valve 1/2"',              qty: 5,  category: 'Plumbing',  subcategory: 'Valves',            brand: 'Veuls Italy',    price: 1600, unit: 'pcs' },
  { name: 'Yala PVC Foot Valve 1 1/2"',                     qty: 1,  category: 'Plumbing',  subcategory: 'Valves',            brand: 'Yala',           price: 1150, unit: 'pcs' },
  { name: 'Kevin Foot Valve 2"',                            qty: 4,  category: 'Plumbing',  subcategory: 'Valves',            brand: 'Kevin',          price: 1950, unit: 'pcs' },
  { name: 'Force LD 810 Foot Valve 1"',                     qty: 13, category: 'Plumbing',  subcategory: 'Valves',            brand: 'Force',          price: 1450, unit: 'pcs' },
  { name: 'LCD PVC Union (PL032) 1"',                       qty: 2,  category: 'Plumbing',  subcategory: 'Pipe Fittings',     brand: 'LCD',            price: 480,  unit: 'pcs' },
  { name: 'ERA Union 1"',                                   qty: 1,  category: 'Plumbing',  subcategory: 'Pipe Fittings',     brand: 'ERA',            price: 520,  unit: 'pcs' },
  { name: 'ERA Union 1 1/2"',                               qty: 1,  category: 'Plumbing',  subcategory: 'Pipe Fittings',     brand: 'ERA',            price: 850,  unit: 'pcs' },
  { name: 'S-Lon PVC Union 1"',                             qty: 1,  category: 'Plumbing',  subcategory: 'Pipe Fittings',     brand: 'S-Lon',          price: 550,  unit: 'pcs' },
  { name: 'Yala PVC Union 1/2"',                            qty: 10, category: 'Plumbing',  subcategory: 'Pipe Fittings',     brand: 'Yala',           price: 280,  unit: 'pcs' },
  { name: 'Euro Aqua Plus PVC Ball Valve 1 1/2" (50mm)',    qty: 12, category: 'Plumbing',  subcategory: 'Valves',            brand: 'Euro Aqua',      price: 1650, unit: 'pcs' },
  { name: 'Best Ford Tec Union 2"',                         qty: 1,  category: 'Plumbing',  subcategory: 'Pipe Fittings',     brand: 'Best Ford Tec',  price: 1200, unit: 'pcs' },
  { name: 'Anton WB Faucet Elbow 20mm x 1/2"',              qty: 1,  category: 'Plumbing',  subcategory: 'Pipe Fittings',     brand: 'Anton',          price: 420,  unit: 'pcs' },
  { name: 'Brass Connect Socket 3/4"',                      qty: 6,  category: 'Plumbing',  subcategory: 'Pipe Fittings',     brand: 'Generic',        price: 650,  unit: 'pcs' },
  { name: 'S-Lon Ball Valve 1 1/4"',                        qty: 2,  category: 'Plumbing',  subcategory: 'Valves',            brand: 'S-Lon',          price: 1750, unit: 'pcs' },
  { name: 'S-Lon Ball Valve 1"',                            qty: 3,  category: 'Plumbing',  subcategory: 'Valves',            brand: 'S-Lon',          price: 1350, unit: 'pcs' },
  { name: 'S-Lon Ball Valve 3/4"',                          qty: 1,  category: 'Plumbing',  subcategory: 'Valves',            brand: 'S-Lon',          price: 980,  unit: 'pcs' },

  // ─── 5. ARCHITECTURAL & SPECIALTY PAINTS ───────────────────────────────────
  { name: 'Nippon 2K Epoxy Marine Paint Red 1L',            qty: 8,  category: 'Paints',    subcategory: 'Specialty Paints',  brand: 'Nippon',         price: 4200, unit: '1L' },
  { name: 'Nippon Interior/Exterior Floor Paint Red 1L',    qty: 5,  category: 'Paints',    subcategory: 'Floor Paints',      brand: 'Nippon',         price: 3100, unit: '1L' },
  { name: 'Nippon Interior Breeze Base 2 1L',               qty: 1,  category: 'Paints',    subcategory: 'Interior Paints',   brand: 'Nippon',         price: 2600, unit: '1L' },
  { name: 'Nippon Exterior Acrylic Wall Filler 1L',         qty: 10, category: 'Paints',    subcategory: 'Fillers & Putty',   brand: 'Nippon',         price: 1450, unit: '1L' },
  { name: 'Duco N/C Putty Grey 1L',                         qty: 8,  category: 'Paints',    subcategory: 'Fillers & Putty',   brand: 'Duco',           price: 2200, unit: '1L' },
  { name: 'Robbialac Floor Coat Black 1L',                  qty: 7,  category: 'Paints',    subcategory: 'Floor Paints',      brand: 'Robbialac',      price: 2850, unit: '1L' },
  { name: 'Robbialac Exterior Roast Red 1L',                qty: 4,  category: 'Paints',    subcategory: 'Exterior Paints',   brand: 'Robbialac',      price: 2750, unit: '1L' },
  { name: 'Robbialac Exterior Sun Set 1L',                  qty: 9,  category: 'Paints',    subcategory: 'Exterior Paints',   brand: 'Robbialac',      price: 2750, unit: '1L' },
  { name: 'Robbialac Exterior Spruce 1L',                   qty: 3,  category: 'Paints',    subcategory: 'Exterior Paints',   brand: 'Robbialac',      price: 2750, unit: '1L' },
  { name: 'Robbialac Exterior Off-White 1L',                qty: 3,  category: 'Paints',    subcategory: 'Exterior Paints',   brand: 'Robbialac',      price: 2750, unit: '1L' },
  { name: 'Robbialac Interior Lime 1L',                     qty: 2,  category: 'Paints',    subcategory: 'Interior Paints',   brand: 'Robbialac',      price: 2450, unit: '1L' },
  { name: 'Robbialac Interior Orchid 1L',                   qty: 4,  category: 'Paints',    subcategory: 'Interior Paints',   brand: 'Robbialac',      price: 2450, unit: '1L' },
  { name: 'Robbialac Interior Fairy Tale 1L',               qty: 3,  category: 'Paints',    subcategory: 'Interior Paints',   brand: 'Robbialac',      price: 2450, unit: '1L' },
  { name: 'Robbialac Interior Easter Egg 1L',                qty: 4,  category: 'Paints',    subcategory: 'Interior Paints',   brand: 'Robbialac',      price: 2450, unit: '1L' },
  { name: 'Robbialac Interior Baby Pink 1L',                qty: 8,  category: 'Paints',    subcategory: 'Interior Paints',   brand: 'Robbialac',      price: 2450, unit: '1L' },
  { name: 'Multilac Floor Paint Black 1L',                  qty: 4,  category: 'Paints',    subcategory: 'Floor Paints',      brand: 'Multilac',       price: 2800, unit: '1L' },
  { name: 'Multilac Floor Paint Bright Red 500ml',          qty: 9,  category: 'Paints',    subcategory: 'Floor Paints',      brand: 'Multilac',       price: 1600, unit: '500ml' },
  { name: 'Multilac Wall Putty Joint Compound 1.7kg',       qty: 3,  category: 'Paints',    subcategory: 'Fillers & Putty',   brand: 'Multilac',       price: 1250, unit: '1.7kg' },
  { name: 'Multilac Floor Paint Grey 1L',                   qty: 3,  category: 'Paints',    subcategory: 'Floor Paints',      brand: 'Multilac',       price: 2800, unit: '1L' },
  { name: 'Multilac Bright Aluminium 1L',                   qty: 2,  category: 'Paints',    subcategory: 'Specialty Paints',  brand: 'Multilac',       price: 3200, unit: '1L' },
];

async function insertProductsBatch8() {
  console.log('🚀 Starting Batch 8 Product Insertion & Smart Stock Upsert...\n');

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

  // Fetch ALL existing products for smart upsert
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
      // ✅ EXISTS — only increment stock
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
      console.log(`[STOCK+] ${existingProd.sku.padEnd(8)} | +${String(item.qty).padStart(3)} | ${item.name}`);

    } else {
      // 🆕 NEW — create category, brand, product & stock
      let cat = catCache.get(item.category.toLowerCase());
      if (!cat) {
        cat = await prisma.category.create({ data: { tenantId: shop.id, name: item.category } });
        catCache.set(item.category.toLowerCase(), cat);
      }

      const subKey = `${item.category}:${item.subcategory}`.toLowerCase();
      let subCat = subCatCache.get(subKey);
      if (!subCat) {
        const existingSub = existingCats.find(
          c => c.name.toLowerCase() === item.subcategory.toLowerCase() && c.parentId === cat.id
        );
        subCat = existingSub || await prisma.category.create({
          data: { tenantId: shop.id, name: item.subcategory, parentId: cat.id },
        });
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
      console.log(`[NEW]    ${hkuCode.padEnd(8)} | Qty:${String(item.qty).padStart(3)} | Rs.${String(item.price).padStart(6)} | ${item.name}`);
    }
  }

  console.log(`\n🎉 BATCH 8 COMPLETE!`);
  console.log(`   ✅ New Products Inserted : ${insertedCount}`);
  console.log(`   🔄 Existing Stock Updated: ${updatedCount}`);
  console.log(`   📋 HKU series now at     : HKU_${String(hkuIndex - 1).padStart(2, '0')}`);
}

insertProductsBatch8()
  .catch(e => {
    console.error('❌ Error:', e.message);
    process.exit(1);
  })
  .finally(() => {
    prisma.$disconnect();
    if (pool) pool.end();
  });
