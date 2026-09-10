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
// BATCH 19 — HKU Series (Second 5-Page Handwritten Audit Product Additions)
// Source: 5 Handwritten Audit Note Pages (September 10, 2026 Audit)
// Covers: Power Tools (Ingco, EMTOP, KOBE, Fixtec, Dongcheng), Drill Bits,
//         Chisels, Hand Saws, Pliers, Drawer Locks & Accessories
// ─────────────────────────────────────────────────────────────────────────────
const productsToInsert = [

  // ─── PAGE 1: TOOLS, EXTENSION CORDS, CHARGERS (Brand codes = Brand names) ──
  { name: 'Ingco Indoor Wheel Brush 390mm', qty: 4, category: 'Hardware & Tools', subcategory: 'Abrasives & Brushes', brand: 'Ingco', price: 1450, unit: 'pcs' },
  { name: 'Ingco 20V Battery Charger', qty: 2, category: 'Power Tools', subcategory: 'Batteries & Chargers', brand: 'Ingco', price: 4850, unit: 'pcs' },
  { name: 'Arfida 6-Port Extension Cord', qty: 2, category: 'Lighting & Electrical', subcategory: 'Sockets & Plugs', brand: 'Arfida', price: 1850, unit: 'pcs' },
  { name: 'Arfida 5-Port Extension Cord', qty: 2, category: 'Lighting & Electrical', subcategory: 'Sockets & Plugs', brand: 'Arfida', price: 1650, unit: 'pcs' },
  { name: 'High Pressure Water Washing Gun (Patented)', qty: 2, category: 'Gardening & Agricultural', subcategory: 'Hoses & Fittings', brand: 'Generic', price: 3450, unit: 'pcs' },
  { name: 'Orange 4-Port Extension Cord 3m', qty: 2, category: 'Lighting & Electrical', subcategory: 'Sockets & Plugs', brand: 'Orange Electric', price: 1950, unit: 'pcs' },
  { name: 'Orange 4-Port Extension Cord 5m', qty: 2, category: 'Lighting & Electrical', subcategory: 'Sockets & Plugs', brand: 'Orange Electric', price: 2450, unit: 'pcs' },
  { name: '[JKK] Electronic Kitchen Scale', qty: 1, category: 'Hardware & Tools', subcategory: 'Measuring & Scales', brand: 'JKK', price: 1850, unit: 'pcs' },
  { name: '[Geepas] Rechargeable LED Flashlight', qty: 1, category: 'Lighting & Electrical', subcategory: 'Bulbs & Lamps', brand: 'Geepas', price: 2850, unit: 'pcs' },
  { name: '[Greef] Portable Electronic Scale', qty: 4, category: 'Hardware & Tools', subcategory: 'Measuring & Scales', brand: 'Generic', price: 1650, unit: 'pcs' },
  { name: 'Milton Thermosteel Vacuum Insulated Bottle', qty: 2, category: 'Hardware & Tools', subcategory: 'General Hardware', brand: 'Milton', price: 3250, unit: 'pcs' },
  { name: 'Ingco 20V Lithium-Ion Battery Pack', qty: 2, category: 'Power Tools', subcategory: 'Batteries & Chargers', brand: 'Ingco', price: 6850, unit: 'pcs' },
  { name: 'Rope Lamp Holder', qty: 40, category: 'Lighting & Electrical', subcategory: 'Sockets & Plugs', brand: 'Generic', price: 350, unit: 'pcs' },
  { name: 'Kevin 20" Handsaw Wooden Handle', qty: 2, category: 'Hardware & Tools', subcategory: 'Hand Tools', brand: 'Kevin', price: 1450, unit: 'pcs' },
  { name: 'Kevin 20" Handsaw Plastic Handle', qty: 4, category: 'Hardware & Tools', subcategory: 'Hand Tools', brand: 'Kevin', price: 1350, unit: 'pcs' },
  { name: '[CCBK] Adeg 50 18" Handsaw Plastic Handle', qty: 5, category: 'Hardware & Tools', subcategory: 'Hand Tools', brand: 'Adeg', price: 1450, unit: 'pcs' },
  { name: '[CCBK] Adeg 50 20" Handsaw Plastic Handle', qty: 5, category: 'Hardware & Tools', subcategory: 'Hand Tools', brand: 'Adeg', price: 1550, unit: 'pcs' },
  { name: '[B] Wellood Heavy Duty Folding Hand Riveter', qty: 2, category: 'Hardware & Tools', subcategory: 'Hand Tools', brand: 'Wellood', price: 2850, unit: 'pcs' },
  { name: 'Quick Release F-Clamp', qty: 3, category: 'Hardware & Tools', subcategory: 'Hand Tools', brand: 'Generic', price: 1650, unit: 'pcs' },

  // ─── PAGE 2: HACKSAWS, LOCKS & POWER TOOLS ────────────────────────────────
  { name: '[Bestool] Hacksaw Frame 12" 300mm', qty: 11, category: 'Hardware & Tools', subcategory: 'Hand Tools', brand: 'BESTOOL', price: 1250, unit: 'pcs' },
  { name: 'Panyi Tools Dual Handle Hacksaw', qty: 6, category: 'Hardware & Tools', subcategory: 'Hand Tools', brand: 'Panyi Tools', price: 1450, unit: 'pcs' },
  { name: '[ECOMEX] Luxury Bell Press Cover', qty: 14, category: 'Lighting & Electrical', subcategory: 'Switches', brand: 'ECOMEX', price: 450, unit: 'pcs' },
  { name: 'Sun Technology Double Holder 250V', qty: 16, category: 'Lighting & Electrical', subcategory: 'Sockets & Plugs', brand: 'Sun Technology', price: 350, unit: 'pcs' },
  { name: '[S.T] Drawer Lock 19mm', qty: 70, category: 'Building Materials', subcategory: 'Door Locks & Handles', brand: 'S.T', price: 380, unit: 'pcs' },
  { name: '[Xiao Bashi] Drawer Lock', qty: 16, category: 'Building Materials', subcategory: 'Door Locks & Handles', brand: 'Xiao Bashi', price: 380, unit: 'pcs' },
  { name: '[666 Brand] Drawer Lock', qty: 12, category: 'Building Materials', subcategory: 'Door Locks & Handles', brand: '666', price: 350, unit: 'pcs' },
  { name: '[RNS] Drawer Lock 16mm', qty: 10, category: 'Building Materials', subcategory: 'Door Locks & Handles', brand: 'RNS', price: 380, unit: 'pcs' },
  { name: '[Razer] Cupboard Lock 75mm 6-Levers', qty: 8, category: 'Building Materials', subcategory: 'Door Locks & Handles', brand: 'Razer', price: 1250, unit: 'pcs' },
  { name: '[MEN] Impact Drill 13mm', qty: 1, category: 'Power Tools', subcategory: 'Power Tools', brand: 'MEN', price: 8500, unit: 'pcs' },
  { name: '[EMTOP] Cordless Pruner Saw 20V 130mm 5"', qty: 2, category: 'Power Tools', subcategory: 'Power Tools', brand: 'EMTOP', price: 16500, unit: 'pcs' },
  { name: '[EMTOP] Cordless Pressure Washer 20V', qty: 2, category: 'Power Tools', subcategory: 'Power Tools', brand: 'EMTOP', price: 18500, unit: 'pcs' },
  { name: 'Impulse Sealer 500V 250mm', qty: 1, category: 'Machinery & Equipment', subcategory: 'Machinery', brand: 'Generic', price: 5850, unit: 'pcs' },
  { name: 'Impulse Sealer 200mm', qty: 3, category: 'Machinery & Equipment', subcategory: 'Machinery', brand: 'Generic', price: 4850, unit: 'pcs' },
  { name: '[YAMADHA] Energy Saver Street Light 1x40W', qty: 3, category: 'Lighting & Electrical', subcategory: 'Outdoor Lamps', brand: 'Yamadha', price: 3850, unit: 'pcs' },
  { name: '[MEN] Angle Grinder Stand', qty: 1, category: 'Power Tools', subcategory: 'Power Tools Accessories', brand: 'MEN', price: 2850, unit: 'pcs' },
  { name: '[MEN] Electric Sander 300W', qty: 3, category: 'Power Tools', subcategory: 'Power Tools', brand: 'MEN', price: 7850, unit: 'pcs' },
  { name: '[MEN] Power Planer 82mm 900W', qty: 1, category: 'Power Tools', subcategory: 'Power Tools', brand: 'MEN', price: 12500, unit: 'pcs' },
  { name: '[FIXTEC] Angle Grinder 700W 100mm 4"', qty: 1, category: 'Power Tools', subcategory: 'Power Tools', brand: 'Fixtec', price: 8500, unit: 'pcs' },

  // ─── PAGE 3: HEAVY POWER TOOLS & NAILERS ──────────────────────────────────
  { name: '[KOBE] Angle Grinder 850W', qty: 5, category: 'Power Tools', subcategory: 'Power Tools', brand: 'KOBE', price: 9500, unit: 'pcs' },
  { name: '[MEN] Angle Grinder 850W', qty: 2, category: 'Power Tools', subcategory: 'Power Tools', brand: 'MEN', price: 8800, unit: 'pcs' },
  { name: '[MEN] Angle Grinder 720W', qty: 8, category: 'Power Tools', subcategory: 'Power Tools', brand: 'MEN', price: 7800, unit: 'pcs' },
  { name: '[Ingco] Impact Drill 1100W', qty: 1, category: 'Power Tools', subcategory: 'Power Tools', brand: 'Ingco', price: 11500, unit: 'pcs' },
  { name: '[Duhangmax] Electric Drill 700W', qty: 2, category: 'Power Tools', subcategory: 'Power Tools', brand: 'Duhangmax', price: 6850, unit: 'pcs' },
  { name: '[Sali] Angle Grinder 1200W', qty: 2, category: 'Power Tools', subcategory: 'Power Tools', brand: 'Sali', price: 12500, unit: 'pcs' },
  { name: '[MEN] Marble Cutter 1050W 110mm', qty: 1, category: 'Power Tools', subcategory: 'Power Tools', brand: 'MEN', price: 9850, unit: 'pcs' },
  { name: '[Dong Cheng] Air Brad Nailer', qty: 1, category: 'Power Tools', subcategory: 'Pneumatic Tools', brand: 'Dong Cheng', price: 8500, unit: 'pcs' },
  { name: '[EMTOP] Air Sander 150mm', qty: 2, category: 'Power Tools', subcategory: 'Pneumatic Tools', brand: 'EMTOP', price: 9850, unit: 'pcs' },
  { name: '[Fixtec] Car Polisher 110W', qty: 1, category: 'Power Tools', subcategory: 'Power Tools', brand: 'Fixtec', price: 6850, unit: 'pcs' },
  { name: '[EMTOP] 20V Cordless Brushless Compact Drill', qty: 9, category: 'Power Tools', subcategory: 'Power Tools', brand: 'EMTOP', price: 14500, unit: 'pcs' },
  { name: '[MEN] Electric Router 1200W 8-12mm', qty: 2, category: 'Power Tools', subcategory: 'Power Tools', brand: 'MEN', price: 13500, unit: 'pcs' },

  // ─── PAGE 4: CHISEL SETS, DRILL BITS & HAND TOOLS (WITH CATEGORY CODES) ───
  { name: 'Ingco 4 Pcs Wood Chisel Set', qty: 9, category: 'Hardware & Tools', subcategory: 'Hand Tools', brand: 'Ingco', price: 2850, unit: 'set' },
  { name: '[HFK] Ingco 3 Pcs Hose Quick Connectors Set 1/2"', qty: 5, category: 'Gardening & Agricultural', subcategory: 'Hoses & Fittings', brand: 'Ingco', price: 850, unit: 'set' },
  { name: '[BCK] Hard Bristle Brush 4"', qty: 4, category: 'Hardware & Tools', subcategory: 'Abrasives & Brushes', brand: 'Generic', price: 450, unit: 'pcs' },
  { name: '[EKK] Deli Scissors DL358215', qty: 2, category: 'Hardware & Tools', subcategory: 'Hand Tools', brand: 'Deli', price: 650, unit: 'pcs' },
  { name: '[JFK] WADFOW Wire Stripper 8.5"', qty: 2, category: 'Hardware & Tools', subcategory: 'Hand Tools', brand: 'WADFOW', price: 1450, unit: 'pcs' },
  { name: '[CFKK] Tolsen Ratchet Crimping Pliers 8.7"', qty: 3, category: 'Hardware & Tools', subcategory: 'Hand Tools', brand: 'Tolsen', price: 2850, unit: 'pcs' },
  { name: '[FKK] Ingco TCT Saw Blade 7 1/4"', qty: 6, category: 'Hardware & Tools', subcategory: 'Power Tools Accessories', brand: 'Ingco', price: 1650, unit: 'pcs' },
  { name: '[CKFK] PET Saw Blade 7"', qty: 1, category: 'Hardware & Tools', subcategory: 'Power Tools Accessories', brand: 'PET', price: 1250, unit: 'pcs' },
  { name: 'Plumb Bob 500g', qty: 2, category: 'Hardware & Tools', subcategory: 'Measuring & Scales', brand: 'Generic', price: 950, unit: 'pcs' },
  { name: '[IRK] Combination Square 300mm', qty: 3, category: 'Hardware & Tools', subcategory: 'Measuring & Scales', brand: 'Generic', price: 1250, unit: 'pcs' },
  { name: '[CCK] Angle Grinder Cutting Disc 4"', qty: 7, category: 'Hardware & Tools', subcategory: 'Abrasives & Brushes', brand: 'Generic', price: 250, unit: 'pcs' },
  { name: '[CCK] Angle Grinder Cutting Disc 4.5"', qty: 1, category: 'Hardware & Tools', subcategory: 'Abrasives & Brushes', brand: 'Generic', price: 280, unit: 'pcs' },
  { name: '[CKK] Oxford Hammer Drill Bit 6mm 100-160mm', qty: 18, category: 'Hardware & Tools', subcategory: 'Power Tools Accessories', brand: 'Oxford', price: 320, unit: 'pcs' },
  { name: '[GKK] Ouruisi Star Hammer Drill Bit 14x110mm', qty: 9, category: 'Hardware & Tools', subcategory: 'Power Tools Accessories', brand: 'Ouruisi Star', price: 580, unit: 'pcs' },
  { name: '[GKK] Hardmen Hammer Drill Bit 10x160mm', qty: 8, category: 'Hardware & Tools', subcategory: 'Power Tools Accessories', brand: 'Hardmen', price: 480, unit: 'pcs' },
  { name: '[EEK] Duhangmax Hammer Drill Bit 16x260mm', qty: 13, category: 'Hardware & Tools', subcategory: 'Power Tools Accessories', brand: 'Duhangmax', price: 780, unit: 'pcs' },
  { name: '[EFK] Hardmen Hammer Drill Bit 14x210mm', qty: 10, category: 'Hardware & Tools', subcategory: 'Power Tools Accessories', brand: 'Hardmen', price: 680, unit: 'pcs' },
  { name: '[SCHF] Ouruisi Star Hammer Drill Bit 7x110mm', qty: 2, category: 'Hardware & Tools', subcategory: 'Power Tools Accessories', brand: 'Ouruisi Star', price: 340, unit: 'pcs' },
  { name: '[JKK] Ouruisi Star Hammer Drill Bit 8x110mm', qty: 5, category: 'Hardware & Tools', subcategory: 'Power Tools Accessories', brand: 'Ouruisi Star', price: 380, unit: 'pcs' },
  { name: '[EHF] Hardmen Hammer Drill Bit 20x260mm', qty: 9, category: 'Hardware & Tools', subcategory: 'Power Tools Accessories', brand: 'Hardmen', price: 950, unit: 'pcs' },
  { name: '[EHF] Hardmen Hammer Drill Bit 12x260mm', qty: 15, category: 'Hardware & Tools', subcategory: 'Power Tools Accessories', brand: 'Hardmen', price: 580, unit: 'pcs' },
  { name: '[BEK] Ouruisi Star Hammer Drill Bit 8x210mm', qty: 3, category: 'Hardware & Tools', subcategory: 'Power Tools Accessories', brand: 'Ouruisi Star', price: 420, unit: 'pcs' },
  { name: '[DCF] Ouruisi Star Hammer Drill Bit 8x100mm', qty: 3, category: 'Hardware & Tools', subcategory: 'Power Tools Accessories', brand: 'Ouruisi Star', price: 420, unit: 'pcs' },
  { name: '[GRK] Ouruisi Star Hammer Drill Bit 8x160mm', qty: 5, category: 'Hardware & Tools', subcategory: 'Power Tools Accessories', brand: 'Ouruisi Star', price: 380, unit: 'pcs' },
  { name: '[DEK] Hardmen Hammer Drill Bit 10x260mm', qty: 1, category: 'Hardware & Tools', subcategory: 'Power Tools Accessories', brand: 'Hardmen', price: 480, unit: 'pcs' },
  { name: '[EGK] Hardmen Hammer Drill Bit 12x160mm', qty: 1, category: 'Hardware & Tools', subcategory: 'Power Tools Accessories', brand: 'Hardmen', price: 520, unit: 'pcs' },
  { name: '[ICK] Hardmen Hammer Drill Bit 14x310mm', qty: 1, category: 'Hardware & Tools', subcategory: 'Power Tools Accessories', brand: 'Hardmen', price: 680, unit: 'pcs' },

  // ─── PAGE 5: SPADE BITS, CHISELS, PLIERS, GLASS CUTTERS (WITH CATEGORY CODES)
  { name: '[HFK] Starex Woodworker Chisel 1.5"', qty: 1, category: 'Hardware & Tools', subcategory: 'Hand Tools', brand: 'Starex Tools', price: 1250, unit: 'pcs' },
  { name: '[GEK] Starex Woodworker Chisel 12mm', qty: 5, category: 'Hardware & Tools', subcategory: 'Hand Tools', brand: 'Starex Tools', price: 950, unit: 'pcs' },
  { name: "[GCK] Roy's Tools Woodworker Chisel 12mm", qty: 3, category: 'Hardware & Tools', subcategory: 'Hand Tools', brand: "Roy's Tools", price: 950, unit: 'pcs' },
  { name: '[BCKK] Tolsen Combination Pliers 8"', qty: 1, category: 'Hardware & Tools', subcategory: 'Hand Tools', brand: 'Tolsen', price: 1450, unit: 'pcs' },
  { name: '[BCKK] Tolsen Aviation Snips Right 10"', qty: 2, category: 'Hardware & Tools', subcategory: 'Hand Tools', brand: 'Tolsen', price: 1850, unit: 'pcs' },
  { name: '[BCKK] Tolsen Aviation Snips Left 10"', qty: 1, category: 'Hardware & Tools', subcategory: 'Hand Tools', brand: 'Tolsen', price: 1850, unit: 'pcs' },
  { name: '[CKRK] Deli Multifunctional Diagonal Pliers', qty: 1, category: 'Hardware & Tools', subcategory: 'Hand Tools', brand: 'Deli', price: 1650, unit: 'pcs' },
  { name: '[CCKK] Aviation Snips 12"', qty: 1, category: 'Hardware & Tools', subcategory: 'Hand Tools', brand: 'Generic', price: 1950, unit: 'pcs' },
  { name: '[BKK] Chuck Key', qty: 1, category: 'Hardware & Tools', subcategory: 'Power Tools Accessories', brand: 'Generic', price: 350, unit: 'pcs' },
  { name: '[DEF] Tolsen Glass Drill Bit 8mm', qty: 1, category: 'Hardware & Tools', subcategory: 'Power Tools Accessories', brand: 'Tolsen', price: 320, unit: 'pcs' },
  { name: '[DEF] Tolsen Glass Drill Bit 12mm', qty: 1, category: 'Hardware & Tools', subcategory: 'Power Tools Accessories', brand: 'Tolsen', price: 420, unit: 'pcs' },
  { name: '[DEF] Tolsen Glass Drill Bit 6mm', qty: 2, category: 'Hardware & Tools', subcategory: 'Power Tools Accessories', brand: 'Tolsen', price: 280, unit: 'pcs' },
  { name: '[CHK] BESTOOL Wood Spade Drill Bit 18mm', qty: 5, category: 'Hardware & Tools', subcategory: 'Power Tools Accessories', brand: 'BESTOOL', price: 480, unit: 'pcs' },
  { name: '[CFK] BESTOOL Wood Spade Drill Bit 12mm', qty: 5, category: 'Hardware & Tools', subcategory: 'Power Tools Accessories', brand: 'BESTOOL', price: 380, unit: 'pcs' },
  { name: '[GKK] Danmi Glass Cutter 6-12mm', qty: 3, category: 'Hardware & Tools', subcategory: 'Hand Tools', brand: 'Danmi', price: 1250, unit: 'pcs' },
  { name: '[CPK] Ingco Wood Spade Drill Bit 25mm', qty: 7, category: 'Hardware & Tools', subcategory: 'Power Tools Accessories', brand: 'Ingco', price: 650, unit: 'pcs' },
  { name: '[CPK] BESTOOL Wood Spade Drill Bit 16mm', qty: 5, category: 'Hardware & Tools', subcategory: 'Power Tools Accessories', brand: 'BESTOOL', price: 450, unit: 'pcs' },
  { name: '[CPK] BESTOOL Wood Spade Drill Bit 15mm', qty: 5, category: 'Hardware & Tools', subcategory: 'Power Tools Accessories', brand: 'BESTOOL', price: 420, unit: 'pcs' },
  { name: '[IKK] Ingco Wood Chisel 9mm', qty: 4, category: 'Hardware & Tools', subcategory: 'Hand Tools', brand: 'Ingco', price: 850, unit: 'pcs' },
  { name: '[EIK] EMTOP Wire Brush 250mm', qty: 3, category: 'Hardware & Tools', subcategory: 'Abrasives & Brushes', brand: 'EMTOP', price: 750, unit: 'pcs' },
  { name: '[CTFK] Deli Insulated Sickle Cable Knife 180mm', qty: 1, category: 'Hardware & Tools', subcategory: 'Hand Tools', brand: 'Deli', price: 1850, unit: 'pcs' },
  { name: '[IJA] Tolsen Long Nose Pliers 8"', qty: 3, category: 'Hardware & Tools', subcategory: 'Hand Tools', brand: 'Tolsen', price: 1450, unit: 'pcs' },
  { name: '[HFK] FEIBAD Pliers 3"', qty: 4, category: 'Hardware & Tools', subcategory: 'Hand Tools', brand: 'FEIBAD', price: 1350, unit: 'pcs' },
  { name: '[HHK] Tolsen Long Nose Pliers 6"', qty: 1, category: 'Hardware & Tools', subcategory: 'Hand Tools', brand: 'Tolsen', price: 1250, unit: 'pcs' },
  { name: '[KKK] WFENG Plier', qty: 3, category: 'Hardware & Tools', subcategory: 'Hand Tools', brand: 'WFENG', price: 1150, unit: 'pcs' },
  { name: '[BBIK] Tolsen Water Pump Pliers', qty: 3, category: 'Hardware & Tools', subcategory: 'Hand Tools', brand: 'Tolsen', price: 1950, unit: 'pcs' },
  { name: '[JJK] Tolsen Wire Stripping Pliers 6"', qty: 1, category: 'Hardware & Tools', subcategory: 'Hand Tools', brand: 'Tolsen', price: 1450, unit: 'pcs' },
  { name: '[BCFK] Deli Stripping Pliers 6.5"', qty: 1, category: 'Hardware & Tools', subcategory: 'Hand Tools', brand: 'Deli', price: 1550, unit: 'pcs' },
  { name: '[HFK] Binding Cutter', qty: 2, category: 'Hardware & Tools', subcategory: 'Hand Tools', brand: 'Generic', price: 950, unit: 'pcs' },
  { name: '[DTR] Yauong Mini Bolt Clippers 8"', qty: 1, category: 'Hardware & Tools', subcategory: 'Hand Tools', brand: 'Yauong', price: 1850, unit: 'pcs' },
  { name: '[BAKK] Ingco Wheel Brush 890mm', qty: 2, category: 'Hardware & Tools', subcategory: 'Abrasives & Brushes', brand: 'Ingco', price: 1450, unit: 'pcs' },
  { name: '[BKK] BESTOOL Wood Spade Drill Bit 20mm', qty: 5, category: 'Hardware & Tools', subcategory: 'Power Tools Accessories', brand: 'BESTOOL', price: 520, unit: 'pcs' },
  { name: '[CRK] BESTOOL Wood Spade Drill Bit 10mm', qty: 5, category: 'Hardware & Tools', subcategory: 'Power Tools Accessories', brand: 'BESTOOL', price: 350, unit: 'pcs' },
];

async function insertProductsBatch19() {
  console.log('🚀 Starting Batch 19 Product Insertion & Smart Stock Upsert...\n');

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

  console.log(`\n🎉 BATCH 19 COMPLETE!`);
  console.log(`   ✅ New Products Inserted : ${insertedCount}`);
  console.log(`   🔄 Existing Stock Updated: ${updatedCount}`);
  console.log(`   📋 HKU series now at     : HKU_${String(hkuIndex - 1).padStart(2, '0')}`);
}

insertProductsBatch19()
  .catch(e => { console.error('❌ Error:', e.message); process.exit(1); })
  .finally(() => { prisma.$disconnect(); if (pool) pool.end(); });
