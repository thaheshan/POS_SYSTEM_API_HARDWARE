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
// BATCH 7 — HKU Series (Auto-continues from last HKU number in DB)
// Source: Handwritten stock audit pages (Gas Regulators, Orange Electric,
//         LGTL Lights, Kevilton Switches pg3, ACL Switches pg4, Krypton)
// ─────────────────────────────────────────────────────────────────────────────
const productsToInsert = [

  // ─── GAS REGULATORS ─────────────────────────────────────────────────────
  // Brand: MAC
  { name: 'MAC Low Pressure Gas Regulator',                 qty: 7,  category: 'Plumbing',     subcategory: 'Gas Fittings',      brand: 'MAC',            price: 1800,  unit: 'pcs' },

  // Brand: Husky
  { name: 'Husky LP Gas Regulator',                        qty: 8,  category: 'Plumbing',     subcategory: 'Gas Fittings',      brand: 'Husky',          price: 2200,  unit: 'pcs' },
  { name: 'Husky Slim Metal Cutter 4 inch (50pcs)',         qty: 5,  category: 'Tools',        subcategory: 'Cutting Tools',     brand: 'Husky',          price: 1200,  unit: 'box' },

  // Brand: Milux
  { name: 'Milux High Pressure Gas Regulator',             qty: 4,  category: 'Plumbing',     subcategory: 'Gas Fittings',      brand: 'Milux',          price: 3500,  unit: 'pcs' },

  // Brand: Stern
  { name: 'Stern High Pressure Gas Regulator',             qty: 5,  category: 'Plumbing',     subcategory: 'Gas Fittings',      brand: 'Stern',          price: 2800,  unit: 'pcs' },

  // Brand: MEN
  { name: 'MEN High Pressure Gas Regulator',               qty: 1,  category: 'Plumbing',     subcategory: 'Gas Fittings',      brand: 'MEN',            price: 2600,  unit: 'pcs' },

  // ─── CHINRO ELECTRICAL ─────────────────────────────────────────────────────
  // 2 boxes (48+20 = 68 pieces total)
  { name: 'Chinro 13A Single Port Multi Socket',           qty: 68, category: 'Electronics',  subcategory: 'Sockets & Plugs',   brand: 'Chinro',         price: 1850,  unit: 'pcs' },
  { name: 'Chinro 13A Plug',                               qty: 18, category: 'Electronics',  subcategory: 'Sockets & Plugs',   brand: 'Chinro',         price: 280,   unit: 'pcs' },

  // ─── ORANGE ELECTRIC — WHITE SERIES ─────────────────────────────────────
  { name: 'Orange Electric White Socket Outlet Indicator', qty: 10, category: 'Electronics',  subcategory: 'Switches',          brand: 'Orange Electric', price: 450,  unit: 'pcs' },
  { name: 'Orange Electric White 1G 1W Bell Press',        qty: 2,  category: 'Electronics',  subcategory: 'Switches',          brand: 'Orange Electric', price: 320,  unit: 'pcs' },
  { name: 'Orange Electric White 2W 1G Switch',            qty: 1,  category: 'Electronics',  subcategory: 'Switches',          brand: 'Orange Electric', price: 420,  unit: 'pcs' },
  { name: 'Orange Electric White 16A 2W 1G Switch',        qty: 5,  category: 'Electronics',  subcategory: 'Switches',          brand: 'Orange Electric', price: 680,  unit: 'pcs' },
  { name: 'Orange Electric White 1W 2G Switch',            qty: 21, category: 'Electronics',  subcategory: 'Switches',          brand: 'Orange Electric', price: 520,  unit: 'pcs' },
  { name: 'Orange Electric White 16A 2W 4G Switch',        qty: 4,  category: 'Electronics',  subcategory: 'Switches',          brand: 'Orange Electric', price: 980,  unit: 'pcs' },
  { name: 'Orange Electric White 2W 3G Switch',            qty: 5,  category: 'Electronics',  subcategory: 'Switches',          brand: 'Orange Electric', price: 750,  unit: 'pcs' },
  { name: 'Orange Electric White 1W 1G Switch',            qty: 15, category: 'Electronics',  subcategory: 'Switches',          brand: 'Orange Electric', price: 380,  unit: 'pcs' },
  { name: 'Orange Electric White Double Pole Indicator',   qty: 3,  category: 'Electronics',  subcategory: 'Switches',          brand: 'Orange Electric', price: 620,  unit: 'pcs' },
  { name: 'Orange Electric White 90W 5-Step Fan Controller', qty: 18, category: 'Electronics',subcategory: 'Switches',          brand: 'Orange Electric', price: 850,  unit: 'pcs' },

  // ─── ORANGE ELECTRIC — BLACK SERIES ─────────────────────────────────────────
  { name: 'Orange Electric Black 1W 4G Switch',            qty: 11, category: 'Electronics',  subcategory: 'Switches',          brand: 'Orange Electric', price: 950,  unit: 'pcs' },
  { name: 'Orange Electric Black 1W 2G Switch',            qty: 4,  category: 'Electronics',  subcategory: 'Switches',          brand: 'Orange Electric', price: 580,  unit: 'pcs' },
  { name: 'Orange Electric Black 2W 3G Switch',            qty: 5,  category: 'Electronics',  subcategory: 'Switches',          brand: 'Orange Electric', price: 780,  unit: 'pcs' },
  { name: 'Orange Electric Black 2G 1W Switch',            qty: 3,  category: 'Electronics',  subcategory: 'Switches',          brand: 'Orange Electric', price: 580,  unit: 'pcs' },
  { name: 'Orange Electric Black 2W 2G Switch',            qty: 3,  category: 'Electronics',  subcategory: 'Switches',          brand: 'Orange Electric', price: 680,  unit: 'pcs' },
  { name: 'Orange Electric Black 2W 4G Switch',            qty: 8,  category: 'Electronics',  subcategory: 'Switches',          brand: 'Orange Electric', price: 980,  unit: 'pcs' },
  { name: 'Orange Electric Black 1W 3G Switch',            qty: 6,  category: 'Electronics',  subcategory: 'Switches',          brand: 'Orange Electric', price: 780,  unit: 'pcs' },
  { name: 'Orange Electric Black 2W 1G Switch',            qty: 17, category: 'Electronics',  subcategory: 'Switches',          brand: 'Orange Electric', price: 420,  unit: 'pcs' },
  { name: 'Orange Electric Black 1G Bell Press',           qty: 7,  category: 'Electronics',  subcategory: 'Switches',          brand: 'Orange Electric', price: 320,  unit: 'pcs' },
  { name: 'Orange Electric Black Double Pole Switch',      qty: 7,  category: 'Electronics',  subcategory: 'Switches',          brand: 'Orange Electric', price: 680,  unit: 'pcs' },
  { name: 'Orange Electric Black AK Blank Plate',          qty: 11, category: 'Electronics',  subcategory: 'Switches',          brand: 'Orange Electric', price: 180,  unit: 'pcs' },
  { name: 'Orange Electric Black SC 1W 3G Switch',         qty: 4,  category: 'Electronics',  subcategory: 'Switches',          brand: 'Orange Electric', price: 780,  unit: 'pcs' },

  // ─── LGTL — LIGHTS ──────────────────────────────────────────────────────
  { name: 'LGTL Surface Down Light 5W',                    qty: 44, category: 'Electronics',  subcategory: 'Lights',            brand: 'LGTL',           price: 850,   unit: 'pcs' },

  // ─── KEVILTON — MAHOGANY FINISH (Page 3) ─────────────────────────────────
  { name: 'Kevilton 2G 2W Switch Mahogany',                 qty: 1,  category: 'Electronics',  subcategory: 'Switches',          brand: 'Kevilton',       price: 1450,  unit: 'pcs' },
  { name: 'Kevilton Telephone Socket Outlet Mahogany',      qty: 1,  category: 'Electronics',  subcategory: 'Sockets & Plugs',   brand: 'Kevilton',       price: 1800,  unit: 'pcs' },
  { name: 'Kevilton 13A Socket Outlet Mahogany',            qty: 1,  category: 'Electronics',  subcategory: 'Sockets & Plugs',   brand: 'Kevilton',       price: 1650,  unit: 'pcs' },
  { name: 'Kevilton 20A Double Pole Switch Mahogany',       qty: 4,  category: 'Electronics',  subcategory: 'Switches',          brand: 'Kevilton',       price: 2200,  unit: 'pcs' },
  { name: 'Kevilton 1G 1W Switch Mahogany',                 qty: 2,  category: 'Electronics',  subcategory: 'Switches',          brand: 'Kevilton',       price: 980,   unit: 'pcs' },
  { name: 'Kevilton 2G 1W Switch Mahogany',                 qty: 1,  category: 'Electronics',  subcategory: 'Switches',          brand: 'Kevilton',       price: 1250,  unit: 'pcs' },

  // ─── KEVILTON — WHITE FINISH (Page 3) ────────────────────────────────────
  { name: 'Kevilton White 1G 2W Switch',                    qty: 25, category: 'Electronics',  subcategory: 'Switches',          brand: 'Kevilton',       price: 680,   unit: 'pcs' },
  { name: 'Kevilton White 1G 1W Switch',                    qty: 7,  category: 'Electronics',  subcategory: 'Switches',          brand: 'Kevilton',       price: 580,   unit: 'pcs' },
  { name: 'Kevilton White 3G 1W Switch',                    qty: 13, category: 'Electronics',  subcategory: 'Switches',          brand: 'Kevilton',       price: 980,   unit: 'pcs' },
  { name: 'Kevilton White 9G 1W Switch 10A',                qty: 4,  category: 'Electronics',  subcategory: 'Switches',          brand: 'Kevilton',       price: 2400,  unit: 'pcs' },
  { name: 'Kevilton White 4G 1W Switch',                    qty: 36, category: 'Electronics',  subcategory: 'Switches',          brand: 'Kevilton',       price: 1250,  unit: 'pcs' },
  { name: 'Kevilton White 1G Blank Plate',                  qty: 1,  category: 'Electronics',  subcategory: 'Switches',          brand: 'Kevilton',       price: 280,   unit: 'pcs' },
  { name: 'Kevilton White 13A Socket Outlet',               qty: 2,  category: 'Electronics',  subcategory: 'Sockets & Plugs',   brand: 'Kevilton',       price: 1450,  unit: 'pcs' },
  { name: 'Kevilton White 2G 2W Switch',                    qty: 9,  category: 'Electronics',  subcategory: 'Switches',          brand: 'Kevilton',       price: 980,   unit: 'pcs' },
  { name: 'Kevilton White 3G 2W Switch',                    qty: 3,  category: 'Electronics',  subcategory: 'Switches',          brand: 'Kevilton',       price: 1250,  unit: 'pcs' },

  // ─── KEVILTON — KUMBUK FINISH (Page 3) ───────────────────────────────────
  { name: 'Kevilton Kumbuk 13A Socket Outlet',            qty: 1,  category: 'Electronics',  subcategory: 'Sockets & Plugs',   brand: 'Kevilton',       price: 1650,  unit: 'pcs' },
  { name: 'Kevilton Kumbuk 3G 2W Switch',                   qty: 6,  category: 'Electronics',  subcategory: 'Switches',          brand: 'Kevilton',       price: 1450,  unit: 'pcs' },
  { name: 'Kevilton Kumbuk 2G 1W Switch',                   qty: 7,  category: 'Electronics',  subcategory: 'Switches',          brand: 'Kevilton',       price: 1050,  unit: 'pcs' },
  { name: 'Kevilton Kumbuk 2G 2W Switch',                   qty: 3,  category: 'Electronics',  subcategory: 'Switches',          brand: 'Kevilton',       price: 1250,  unit: 'pcs' },

  // ─── KEVILTON — BLACK FINISH (Page 3) ────────────────────────────────────
  { name: 'Kevilton Black 1G 2W Switch',                    qty: 5,  category: 'Electronics',  subcategory: 'Switches',          brand: 'Kevilton',       price: 680,   unit: 'pcs' },
  { name: 'Kevilton Black 3G 1W Switch',                    qty: 1,  category: 'Electronics',  subcategory: 'Switches',          brand: 'Kevilton',       price: 980,   unit: 'pcs' },
  { name: 'Kevilton Black 4G 1W Switch',                    qty: 1,  category: 'Electronics',  subcategory: 'Switches',          brand: 'Kevilton',       price: 1250,  unit: 'pcs' },
  { name: 'Kevilton Black 2G 1W Switch',                    qty: 16, category: 'Electronics',  subcategory: 'Switches',          brand: 'Kevilton',       price: 780,   unit: 'pcs' },
  { name: 'Kevilton Black 1G 1W Switch',                    qty: 27, category: 'Electronics',  subcategory: 'Switches',          brand: 'Kevilton',       price: 580,   unit: 'pcs' },
  { name: 'Kevilton Black 30A Base Module',                 qty: 17, category: 'Electronics',  subcategory: 'Switches',          brand: 'Kevilton',       price: 1200,  unit: 'pcs' },

  // ─── ACL — BLACK FINISH (Page 4) ─────────────────────────────────────────
  { name: 'ACL Black 1G 2W Switch',                        qty: 16, category: 'Electronics',  subcategory: 'Switches',          brand: 'ACL',            price: 680,   unit: 'pcs' },
  { name: 'ACL Black Bell Press',                          qty: 2,  category: 'Electronics',  subcategory: 'Switches',          brand: 'ACL',            price: 450,   unit: 'pcs' },
  { name: 'ACL Black 4G 2W Switch',                        qty: 1,  category: 'Electronics',  subcategory: 'Switches',          brand: 'ACL',            price: 1650,  unit: 'pcs' },
  { name: 'ACL Black 3G 1W Switch',                        qty: 24, category: 'Electronics',  subcategory: 'Switches',          brand: 'ACL',            price: 980,   unit: 'pcs' },
  { name: 'ACL Black Blank Plate',                         qty: 2,  category: 'Electronics',  subcategory: 'Switches',          brand: 'ACL',            price: 280,   unit: 'pcs' },
  { name: 'ACL Black 4G 1W Switch',                        qty: 24, category: 'Electronics',  subcategory: 'Switches',          brand: 'ACL',            price: 1250,  unit: 'pcs' },
  { name: 'ACL Black 2G 1W Switch',                        qty: 1,  category: 'Electronics',  subcategory: 'Switches',          brand: 'ACL',            price: 780,   unit: 'pcs' },
  { name: 'ACL Black 1G 1W Switch',                        qty: 18, category: 'Electronics',  subcategory: 'Switches',          brand: 'ACL',            price: 580,   unit: 'pcs' },
  { name: 'ACL Black 30A Base Module',                     qty: 2,  category: 'Electronics',  subcategory: 'Switches',          brand: 'ACL',            price: 1200,  unit: 'pcs' },
  { name: 'ACL Black 3G 2W Switch',                        qty: 5,  category: 'Electronics',  subcategory: 'Switches',          brand: 'ACL',            price: 1250,  unit: 'pcs' },
  { name: 'ACL Black 2G 2W Switch',                        qty: 2,  category: 'Electronics',  subcategory: 'Switches',          brand: 'ACL',            price: 980,   unit: 'pcs' },
  { name: 'ACL Black 2G 2W Switch (One Gang)',             qty: 16, category: 'Electronics',  subcategory: 'Switches',          brand: 'ACL',            price: 780,   unit: 'pcs' },

  // ─── ACL — WHITE FINISH (Page 4) ─────────────────────────────────────────
  { name: 'ACL White 1G 2W Switch',                        qty: 18, category: 'Electronics',  subcategory: 'Switches',          brand: 'ACL',            price: 680,   unit: 'pcs' },
  { name: 'ACL White 1G 1W Switch',                        qty: 20, category: 'Electronics',  subcategory: 'Switches',          brand: 'ACL',            price: 580,   unit: 'pcs' },
  { name: 'ACL White 3G 1W Switch',                        qty: 18, category: 'Electronics',  subcategory: 'Switches',          brand: 'ACL',            price: 980,   unit: 'pcs' },
  { name: 'ACL White 2G 1W Switch',                        qty: 11, category: 'Electronics',  subcategory: 'Switches',          brand: 'ACL',            price: 780,   unit: 'pcs' },
  { name: 'ACL White 4G 1W Switch',                        qty: 12, category: 'Electronics',  subcategory: 'Switches',          brand: 'ACL',            price: 1250,  unit: 'pcs' },
  { name: 'ACL White 13A Socket Outlet',                   qty: 2,  category: 'Electronics',  subcategory: 'Sockets & Plugs',   brand: 'ACL',            price: 1450,  unit: 'pcs' },
  { name: 'ACL White Double Pole Switch',                  qty: 6,  category: 'Electronics',  subcategory: 'Switches',          brand: 'ACL',            price: 1650,  unit: 'pcs' },
  { name: 'ACL White Socket Outlet',                       qty: 5,  category: 'Electronics',  subcategory: 'Sockets & Plugs',   brand: 'ACL',            price: 1250,  unit: 'pcs' },
  { name: 'ACL White Switch Socket Outlet',                qty: 4,  category: 'Electronics',  subcategory: 'Sockets & Plugs',   brand: 'ACL',            price: 1450,  unit: 'pcs' },
  { name: 'ACL White 2G 2W Switch',                        qty: 7,  category: 'Electronics',  subcategory: 'Switches',          brand: 'ACL',            price: 980,   unit: 'pcs' },
  { name: 'ACL White 13A 2G 1W Switch',                   qty: 25, category: 'Electronics',  subcategory: 'Switches',          brand: 'ACL',            price: 980,   unit: 'pcs' },
  { name: 'ACL White 3G 2W Switch',                        qty: 10, category: 'Electronics',  subcategory: 'Switches',          brand: 'ACL',            price: 1250,  unit: 'pcs' },
  { name: 'ACL White Telephone Socket Outlet',             qty: 2,  category: 'Electronics',  subcategory: 'Sockets & Plugs',   brand: 'ACL',            price: 1800,  unit: 'pcs' },
  { name: 'ACL White 5G 1W Switch',                        qty: 1,  category: 'Electronics',  subcategory: 'Switches',          brand: 'ACL',            price: 1650,  unit: 'pcs' },

  // ─── ACL — BASE MODULE (Page 4) ──────────────────────────────────────────
  { name: 'ACL 13A Base Module',                           qty: 40, category: 'Electronics',  subcategory: 'Switches',          brand: 'ACL',            price: 850,   unit: 'pcs' },

  // ─── KRYPTON — WHITE SERIES ─────────────────────────────────────────────
  { name: 'Krypton White 3G 1W Switch',                    qty: 1,  category: 'Electronics',  subcategory: 'Switches',          brand: 'Krypton',        price: 650,   unit: 'pcs' },
  { name: 'Krypton White Fan Controller',                  qty: 1,  category: 'Electronics',  subcategory: 'Switches',          brand: 'Krypton',        price: 980,   unit: 'pcs' },
];

async function insertProductsBatch7() {
  console.log('🚀 Starting Batch 7 — HKU Series (Gas Regulators, Switches, Kevilton, ACL, Orange Electric)...');

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

  console.log(`\n🎉 BATCH 7 COMPLETE!`);
  console.log(`   ✅ New Products Inserted : ${insertedCount}`);
  console.log(`   🔄 Existing Stock Updated: ${updatedCount}`);
  console.log(`   📋 HKU series now at     : HKU_${String(hkuIndex - 1).padStart(2, '0')}`);
}

insertProductsBatch7()
  .catch(e => {
    console.error('❌ Error:', e.message);
    process.exit(1);
  })
  .finally(() => {
    prisma.$disconnect();
    if (pool) pool.end();
  });
