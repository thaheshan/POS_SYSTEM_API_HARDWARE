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
// BATCH 20 — HKU Series (Third 5-Page Handwritten Audit Product Additions)
// Source: 5 Handwritten Audit Note Pages (September 11, 2026 Audit - Images 1-5)
// Covers: Hammer Drill Bits, Glass Drill Bits, Riveters, Hex Key Sets, Tap Sets,
//         Rim Night Latches, Welding Rods & Magnet Sets, Pullers, Showcase Lighting,
//         Sensors & Alarms, Traps, Grinding Wheels & Accessories
// ─────────────────────────────────────────────────────────────────────────────
const productsToInsert = [

  // ─── PAGE 1: HAMMER & GLASS DRILL BITS ──────────────────────────────────
  { name: '[DGRK] Ouruisi Star Hammer Drill Bit 10x160mm', qty: 2, category: 'Hardware & Tools', subcategory: 'Power Tools Accessories', brand: 'Ouruisi Star', price: 480, unit: 'pcs' },
  { name: '[ECK] Oxford Hammer Drill Bit 8x150/210mm', qty: 2, category: 'Hardware & Tools', subcategory: 'Power Tools Accessories', brand: 'Oxford', price: 420, unit: 'pcs' },
  { name: '[ECK] Ingco Hammer Drill Bit 10mm', qty: 2, category: 'Hardware & Tools', subcategory: 'Power Tools Accessories', brand: 'Ingco', price: 480, unit: 'pcs' },
  { name: '[DKK] Ouruisi Star Hammer Drill Bit 7x160mm', qty: 3, category: 'Hardware & Tools', subcategory: 'Power Tools Accessories', brand: 'Ouruisi Star', price: 340, unit: 'pcs' },
  { name: '[DKK] Deli Hammer Drill Bit 7mm', qty: 1, category: 'Hardware & Tools', subcategory: 'Power Tools Accessories', brand: 'Deli', price: 340, unit: 'pcs' },
  { name: 'PET Glass Drill Bit 7mm', qty: 2, category: 'Hardware & Tools', subcategory: 'Power Tools Accessories', brand: 'PET', price: 300, unit: 'pcs' },
  { name: 'PET Glass Drill Bit 10mm', qty: 3, category: 'Hardware & Tools', subcategory: 'Power Tools Accessories', brand: 'PET', price: 380, unit: 'pcs' },
  { name: 'PET Glass Drill Bit 8mm', qty: 9, category: 'Hardware & Tools', subcategory: 'Power Tools Accessories', brand: 'PET', price: 340, unit: 'pcs' },
  { name: '[BBRK] Husky Hammer Drill Bit 22x200/250mm', qty: 1, category: 'Hardware & Tools', subcategory: 'Power Tools Accessories', brand: 'Husky', price: 1250, unit: 'pcs' },
  { name: '[HFK] Hardmen Hammer Drill Bit 16x310mm', qty: 9, category: 'Hardware & Tools', subcategory: 'Power Tools Accessories', brand: 'Hardmen', price: 850, unit: 'pcs' },
  { name: '[IEK] Hardmen Hammer Drill Bit 18x310mm', qty: 7, category: 'Hardware & Tools', subcategory: 'Power Tools Accessories', brand: 'Hardmen', price: 950, unit: 'pcs' },

  // ─── PAGE 2: HAND TOOLS, RIVETERS, HEX KEYS, TAP SETS & BITS ─────────────
  { name: '[CJKK] Jinma Hand Riveter 8.5"', qty: 1, category: 'Hardware & Tools', subcategory: 'Hand Tools', brand: 'Jinma', price: 1850, unit: 'pcs' },
  { name: '[EJK] MALELION 10Pcs/Set Mounted Stones', qty: 2, category: 'Hardware & Tools', subcategory: 'Abrasives & Brushes', brand: 'MALELION', price: 1250, unit: 'set' },
  { name: '[HFK] Professional Filter Wrench', qty: 3, category: 'Hardware & Tools', subcategory: 'Hand Tools', brand: 'Generic', price: 1450, unit: 'pcs' },
  { name: '[JKK] FEIBAD Hand Riveter Series', qty: 1, category: 'Hardware & Tools', subcategory: 'Hand Tools', brand: 'FEIBAD', price: 1950, unit: 'pcs' },
  { name: '[CHK] ORV Durable Wrench 9Pcs Hex Key Set', qty: 1, category: 'Hardware & Tools', subcategory: 'Hand Tools', brand: 'ORV', price: 1650, unit: 'set' },
  { name: '[IEK] YH Needle File Set', qty: 3, category: 'Hardware & Tools', subcategory: 'Hand Tools', brand: 'YH', price: 950, unit: 'set' },
  { name: '[GFK] Faucet and Sink Installer Tool', qty: 2, category: 'Plumbing & Sanitaryware', subcategory: 'Plumbing Tools', brand: 'Generic', price: 1450, unit: 'pcs' },
  { name: '[BBGK] Tolsen 9Pcs Torx Long Arm Hex Key Set', qty: 2, category: 'Hardware & Tools', subcategory: 'Hand Tools', brand: 'Tolsen', price: 2250, unit: 'set' },
  { name: '[BCKK] Wood Chisel 51mm 2"', qty: 4, category: 'Hardware & Tools', subcategory: 'Hand Tools', brand: 'Generic', price: 1250, unit: 'pcs' },
  { name: '[BEKK] Tokea 9Pcs Ball Point Extra Long Arm Key Set', qty: 3, category: 'Hardware & Tools', subcategory: 'Hand Tools', brand: 'Tokea', price: 1850, unit: 'set' },
  { name: '[CFK] ZHWEI TCT Wood Hole Saw 16mm', qty: 1, category: 'Hardware & Tools', subcategory: 'Power Tools Accessories', brand: 'ZHWEI', price: 650, unit: 'pcs' },
  { name: '[DBK] ZHWEI TCT Wood Hole Saw 20mm', qty: 2, category: 'Hardware & Tools', subcategory: 'Power Tools Accessories', brand: 'ZHWEI', price: 750, unit: 'pcs' },
  { name: 'Ingco Chuck Key', qty: 2, category: 'Hardware & Tools', subcategory: 'Power Tools Accessories', brand: 'Ingco', price: 450, unit: 'pcs' },
  { name: 'Tolsen PVC Pipe Cutter 225mm 9"', qty: 1, category: 'Hardware & Tools', subcategory: 'Plumbing Tools', brand: 'Tolsen', price: 1850, unit: 'pcs' },
  { name: '[KAA] 4Pc Plastic Scrapers Set', qty: 1, category: 'Hardware & Tools', subcategory: 'Hand Tools', brand: 'Generic', price: 450, unit: 'set' },
  { name: '[EFK] Professional Water Gun Head Suit', qty: 2, category: 'Gardening & Agricultural', subcategory: 'Hoses & Fittings', brand: 'Generic', price: 1250, unit: 'set' },
  { name: '[DGKK] 12Pc Tap and Die Set', qty: 2, category: 'Hardware & Tools', subcategory: 'Hand Tools', brand: 'Generic', price: 3850, unit: 'set' },
  { name: '[CBKK] Bestool 8Pc Tap Set', qty: 3, category: 'Hardware & Tools', subcategory: 'Hand Tools', brand: 'Bestool', price: 2850, unit: 'set' },
  { name: '[EGK] Door Viewer 360 Degree (Door Eye)', qty: 1, category: 'Building Materials', subcategory: 'Door Locks & Handles', brand: 'Generic', price: 650, unit: 'pcs' },
  { name: '[FBK] BOASHI Screwdriver Bit Set', qty: 4, category: 'Hardware & Tools', subcategory: 'Power Tools Accessories', brand: 'BOASHI', price: 850, unit: 'set' },
  { name: '[HK] WEIXINFENG Screwdriver Bit Set 2mm', qty: 7, category: 'Hardware & Tools', subcategory: 'Power Tools Accessories', brand: 'WEIXINFENG', price: 750, unit: 'set' },
  { name: 'KING LION 4Pcs Magnetic Nutsetters', qty: 1, category: 'Hardware & Tools', subcategory: 'Power Tools Accessories', brand: 'KING LION', price: 1250, unit: 'set' },
  { name: '[GFK] Groot Soldering Iron', qty: 1, category: 'Hardware & Tools', subcategory: 'Electrical Tools', brand: 'Groot', price: 1450, unit: 'pcs' },
  { name: '[FHF] XIONGFA Carpenter Pincers', qty: 1, category: 'Hardware & Tools', subcategory: 'Hand Tools', brand: 'XIONGFA', price: 1250, unit: 'pcs' },
  { name: '[DKK] Boutique Steel Hook', qty: 4, category: 'Hardware & Tools', subcategory: 'General Hardware', brand: 'Generic', price: 350, unit: 'pcs' },
  { name: '[EKK] Makita Planer Blade', qty: 7, category: 'Power Tools', subcategory: 'Power Tools Accessories', brand: 'Makita', price: 1850, unit: 'pcs' },
  { name: '[BDKK] Deli 9Pcs Long Arm Ball End Hex Key Set', qty: 4, category: 'Hardware & Tools', subcategory: 'Hand Tools', brand: 'Deli', price: 1950, unit: 'set' },
  { name: '[EKK] AOVCS Door Stopper', qty: 3, category: 'Building Materials', subcategory: 'Door Locks & Handles', brand: 'AOVCS', price: 450, unit: 'pcs' },
  { name: '[BGK] 4Pc Plastic Scrapers', qty: 3, category: 'Hardware & Tools', subcategory: 'Hand Tools', brand: 'Generic', price: 450, unit: 'set' },

  // ─── PAGE 3: LATCHES, WELDING HOLDERS, HOLE SAWS & MEASURING TOOLS ─────────
  { name: '[BDFK] GREEN BIRD Rim Night Latch', qty: 4, category: 'Building Materials', subcategory: 'Door Locks & Handles', brand: 'GREEN BIRD', price: 2850, unit: 'pcs' },
  { name: '[FKK] Glue Gun', qty: 2, category: 'Hardware & Tools', subcategory: 'Electrical Tools', brand: 'Generic', price: 1250, unit: 'pcs' },
  { name: '[HFK] Magnetic Welding Holder', qty: 2, category: 'Hardware & Tools', subcategory: 'Welding Tools', brand: 'Generic', price: 1850, unit: 'pcs' },
  { name: '[BJHF] 6 Pcs Welding Magnet Set', qty: 2, category: 'Hardware & Tools', subcategory: 'Welding Tools', brand: 'Generic', price: 2450, unit: 'set' },
  { name: '[JEK] Adapter', qty: 1, category: 'Lighting & Electrical', subcategory: 'Sockets & Plugs', brand: 'Generic', price: 450, unit: 'pcs' },
  { name: '[DKK] Emtop Pencil Brush', qty: 5, category: 'Hardware & Tools', subcategory: 'Abrasives & Brushes', brand: 'EMTOP', price: 550, unit: 'pcs' },
  { name: '[BKFK] Nylon End Brush', qty: 6, category: 'Hardware & Tools', subcategory: 'Abrasives & Brushes', brand: 'Generic', price: 450, unit: 'pcs' },
  { name: '[GGK] Sali TCT Wood Hole Saw 22mm', qty: 1, category: 'Hardware & Tools', subcategory: 'Power Tools Accessories', brand: 'Sali', price: 850, unit: 'pcs' },
  { name: '[BKFK] Sali TCT Wood Hole Saw 25mm', qty: 1, category: 'Hardware & Tools', subcategory: 'Power Tools Accessories', brand: 'Sali', price: 950, unit: 'pcs' },
  { name: '[BKFK] Sali TCT Wood Hole Saw 32mm', qty: 1, category: 'Hardware & Tools', subcategory: 'Power Tools Accessories', brand: 'Sali', price: 1150, unit: 'pcs' },
  { name: '[DKK] ZHWEI TCT Wood Hole Saw 19mm', qty: 4, category: 'Hardware & Tools', subcategory: 'Power Tools Accessories', brand: 'ZHWEI', price: 750, unit: 'pcs' },
  { name: '[DBK] ZHWEI TCT Wood Hole Saw 20mm', qty: 2, category: 'Hardware & Tools', subcategory: 'Power Tools Accessories', brand: 'ZHWEI', price: 750, unit: 'pcs' },
  { name: 'Ouruisi Star Adjustable Circle Cutter 120mm', qty: 5, category: 'Hardware & Tools', subcategory: 'Power Tools Accessories', brand: 'Ouruisi Star', price: 1450, unit: 'pcs' },
  { name: '[BDKK] Ouruisi Star Adjustable Circle Cutter 200mm', qty: 2, category: 'Hardware & Tools', subcategory: 'Power Tools Accessories', brand: 'Ouruisi Star', price: 1850, unit: 'pcs' },
  { name: '[JKK] 5m Metal Sink and Drain Cleaner', qty: 3, category: 'Plumbing & Sanitaryware', subcategory: 'Plumbing Tools', brand: 'Generic', price: 1250, unit: 'pcs' },
  { name: 'Geanrich Water Spray Nozzle', qty: 3, category: 'Gardening & Agricultural', subcategory: 'Hoses & Fittings', brand: 'Geanrich', price: 850, unit: 'pcs' },
  { name: '[BCFK] Staple Gun Tapeceiro Revolver', qty: 1, category: 'Hardware & Tools', subcategory: 'Hand Tools', brand: 'Generic', price: 2450, unit: 'pcs' },
  { name: '[BBFK] Heavy Duty Gun Tacker', qty: 3, category: 'Hardware & Tools', subcategory: 'Hand Tools', brand: 'Generic', price: 2250, unit: 'pcs' },
  { name: '[GFK] Plumb Bob 500g', qty: 2, category: 'Hardware & Tools', subcategory: 'Measuring & Scales', brand: 'Generic', price: 950, unit: 'pcs' },
  { name: '[HHK] Electric Soldering Iron', qty: 2, category: 'Hardware & Tools', subcategory: 'Electrical Tools', brand: 'Generic', price: 1450, unit: 'pcs' },
  { name: '[EDK] Deli Scissors', qty: 1, category: 'Hardware & Tools', subcategory: 'Hand Tools', brand: 'Deli', price: 650, unit: 'pcs' },
  { name: '[GCF] American Type Tinman Snips 8"', qty: 2, category: 'Hardware & Tools', subcategory: 'Hand Tools', brand: 'Generic', price: 1650, unit: 'pcs' },
  { name: '[BHIK] Aluminium Level Bar 2 Feet', qty: 11, category: 'Hardware & Tools', subcategory: 'Measuring & Scales', brand: 'Generic', price: 1450, unit: 'pcs' },
  { name: '[BCEK] Aluminium Level Bar 1 Foot', qty: 12, category: 'Hardware & Tools', subcategory: 'Measuring & Scales', brand: 'Generic', price: 950, unit: 'pcs' },
  { name: '[DKKK] Restpol SDS-Plus Adaptor', qty: 3, category: 'Hardware & Tools', subcategory: 'Power Tools Accessories', brand: 'Restpol', price: 850, unit: 'pcs' },

  // ─── PAGE 4: TOWER BOLTS, HINGES, WELDING RODS & PULLERS ─────────────────
  { name: '[HKK] Hardware SS Tower Bolt 6"', qty: 6, category: 'Building Materials', subcategory: 'Hinges & Bolts', brand: 'HARDWARE', price: 340, unit: 'pcs' },
  { name: '[HKK] Balner SS Tower Bolt 4"', qty: 5, category: 'Building Materials', subcategory: 'Hinges & Bolts', brand: 'Balner', price: 240, unit: 'pcs' },
  { name: '[AIK] CHENGTAI SS Butt Hinges 4"', qty: 20, category: 'Building Materials', subcategory: 'Hinges & Bolts', brand: 'CHENGTAI', price: 280, unit: 'pcs' },
  { name: '[HHF] SS Butt Hinges 5x3"', qty: 17, category: 'Building Materials', subcategory: 'Hinges & Bolts', brand: 'Generic', price: 380, unit: 'pcs' },
  { name: '[DKKK] Special Welding Rods 10lb', qty: 2, category: 'Hardware & Tools', subcategory: 'Welding Tools', brand: 'Generic', price: 4850, unit: 'box' },
  { name: '[DKKK/kg] 2.5mm Special Welding Rods', qty: 10, category: 'Hardware & Tools', subcategory: 'Welding Tools', brand: 'Generic', price: 950, unit: 'kg' },
  { name: 'Kobe Welding Rods 1200', qty: 6, category: 'Hardware & Tools', subcategory: 'Welding Tools', brand: 'Kobe', price: 1850, unit: 'pack' },
  { name: 'Kobe Welding Rods 2400', qty: 4, category: 'Hardware & Tools', subcategory: 'Welding Tools', brand: 'Kobe', price: 2450, unit: 'pack' },
  { name: 'Husky Welding Rods 5kg', qty: 7, category: 'Hardware & Tools', subcategory: 'Welding Tools', brand: 'Husky', price: 4250, unit: 'box' },
  { name: 'Husky Welding Rods 2.5kg', qty: 3, category: 'Hardware & Tools', subcategory: 'Welding Tools', brand: 'Husky', price: 2250, unit: 'box' },
  { name: '[BJKK] WADFOW Chain Clamp Locking Pliers 10"', qty: 5, category: 'Hardware & Tools', subcategory: 'Hand Tools', brand: 'WADFOW', price: 2850, unit: 'pcs' },
  { name: '[DJIK] 3-Jaw Gear Puller 4"', qty: 1, category: 'Hardware & Tools', subcategory: 'Hand Tools', brand: 'Generic', price: 3450, unit: 'pcs' },
  { name: 'Bathroom Mixer Tap Set', qty: 1, category: 'Plumbing & Sanitaryware', subcategory: 'Bathroom Accessories', brand: 'Generic', price: 8500, unit: 'set' },
  { name: '[BBKKR] Curve Saw Conversion Head', qty: 2, category: 'Power Tools', subcategory: 'Power Tools Accessories', brand: 'Generic', price: 2250, unit: 'pcs' },
  { name: '[DFKK] Razer Verti Bolt', qty: 4, category: 'Building Materials', subcategory: 'Hinges & Bolts', brand: 'Razer', price: 650, unit: 'pcs' },
  { name: '[RECK] Three-Jaw Pull Puller 3"', qty: 2, category: 'Hardware & Tools', subcategory: 'Hand Tools', brand: 'Generic', price: 2850, unit: 'pcs' },

  // ─── PAGE 5: SHOWCASE LIGHTING, SENSORS, ALARMS & GRINDING WHEELS ─────────
  { name: 'LGL Biscuit Light (Magnet Yellow)', qty: 4, category: 'Lighting & Electrical', subcategory: 'Decorative Lamps', brand: 'LGL', price: 1250, unit: 'pcs' },
  { name: 'Venus LED Spot Light 3W 3800k White Body (S-EF-SPL-161)', qty: 52, category: 'Lighting & Electrical', subcategory: 'Spotlights', brand: 'VENUS', price: 550, unit: 'pcs' },
  { name: 'Venus LED Spot Light 3W 3000k Black Body (S-EF-SPL-260)', qty: 14, category: 'Lighting & Electrical', subcategory: 'Spotlights', brand: 'VENUS', price: 550, unit: 'pcs' },
  { name: 'Venus LED Spot Light 3W 6500k (S-EF-SPL-160)', qty: 2, category: 'Lighting & Electrical', subcategory: 'Spotlights', brand: 'VENUS', price: 550, unit: 'pcs' },
  { name: 'Venus LED Spot Light 3W 6500k (S-EF-SPL-162)', qty: 2, category: 'Lighting & Electrical', subcategory: 'Spotlights', brand: 'VENUS', price: 550, unit: 'pcs' },
  { name: 'Venus LED Spot Light 3W 3000k (S-EF-SPL-163)', qty: 5, category: 'Lighting & Electrical', subcategory: 'Spotlights', brand: 'VENUS', price: 550, unit: 'pcs' },
  { name: 'LGL LED Downlight 5W 6000k White Body (A-EF-DLN-067)', qty: 7, category: 'Lighting & Electrical', subcategory: 'Ceiling Lamps', brand: 'LGL', price: 750, unit: 'pcs' },
  { name: 'LGL LED Downlight 5W 3000k Black Body (A-EF-DLN-068)', qty: 1, category: 'Lighting & Electrical', subcategory: 'Ceiling Lamps', brand: 'LGL', price: 750, unit: 'pcs' },
  { name: 'LGL Surface Downlight 5W 3000k Black Body (A-EF-DLN-068)', qty: 7, category: 'Lighting & Electrical', subcategory: 'Ceiling Lamps', brand: 'LGL', price: 850, unit: 'pcs' },
  { name: 'LGL LED Spot Light 3W (S-EF-SPL-211)', qty: 1, category: 'Lighting & Electrical', subcategory: 'Spotlights', brand: 'LGL', price: 650, unit: 'pcs' },
  { name: 'LGL LED Spot Light 3W (S-EF-SPL-210)', qty: 2, category: 'Lighting & Electrical', subcategory: 'Spotlights', brand: 'LGL', price: 650, unit: 'pcs' },
  { name: 'LGL Surface Downlight 5W 3000k (A-EF-DLN-059)', qty: 1, category: 'Lighting & Electrical', subcategory: 'Ceiling Lamps', brand: 'LGL', price: 850, unit: 'pcs' },
  { name: 'Venus Spot Light 10W 3000k (S-EF-SPL-167)', qty: 20, category: 'Lighting & Electrical', subcategory: 'Spotlights', brand: 'VENUS', price: 950, unit: 'pcs' },
  { name: 'LGL LED Surface Downlight 5W 3000k (A-EF-DLN-060)', qty: 46, category: 'Lighting & Electrical', subcategory: 'Ceiling Lamps', brand: 'LGL', price: 850, unit: 'pcs' },
  { name: 'LGL LED Surface Downlight 5W 6000k Black (A-EF-DLN-060)', qty: 6, category: 'Lighting & Electrical', subcategory: 'Ceiling Lamps', brand: 'LGL', price: 850, unit: 'pcs' },
  { name: 'HEDANS LED Downlight 5W 6000k (AEF-DLN-065)', qty: 1, category: 'Lighting & Electrical', subcategory: 'Ceiling Lamps', brand: 'HEDANS', price: 750, unit: 'pcs' },
  { name: 'HEDANS LED Spot Light 3W Warm White', qty: 43, category: 'Lighting & Electrical', subcategory: 'Spotlights', brand: 'HEDANS', price: 550, unit: 'pcs' },
  { name: 'HEDANS Panel Light 3W Black 3000k', qty: 2, category: 'Lighting & Electrical', subcategory: 'Ceiling Lamps', brand: 'HEDANS', price: 650, unit: 'pcs' },
  { name: 'Bird Sound Bell 220V', qty: 36, category: 'Lighting & Electrical', subcategory: 'Switches', brand: 'Generic', price: 850, unit: 'pcs' },
  { name: 'Wall Sen Infrared Motion Sensor', qty: 2, category: 'Lighting & Electrical', subcategory: 'Sensors & Automation', brand: 'Generic', price: 2450, unit: 'pcs' },
  { name: 'Mini Sensor Alarm', qty: 1, category: 'Lighting & Electrical', subcategory: 'Sensors & Automation', brand: 'Generic', price: 1850, unit: 'pcs' },
  { name: 'LED High Power Lamp COB 5W (GJK)', qty: 48, category: 'Lighting & Electrical', subcategory: 'Bulbs & Lamps', brand: 'Generic', price: 650, unit: 'pcs' },
  { name: 'Liquid Level Control Switch (YT-70AB-03 250V)', qty: 1, category: 'Lighting & Electrical', subcategory: 'Sensors & Automation', brand: 'Generic', price: 1950, unit: 'pcs' },
  { name: 'Mengary Cistern Ball Cock', qty: 5, category: 'Plumbing & Sanitaryware', subcategory: 'Valves & Fittings', brand: 'Mengary', price: 1450, unit: 'pcs' },
  { name: 'Green Force Mouse and Rat Allure Trap', qty: 3, category: 'Hardware & Tools', subcategory: 'General Hardware', brand: 'Green Force', price: 750, unit: 'pcs' },
  { name: 'JZM Vacuum Brazed Grinding Wheel 20mm Rounded Edge', qty: 7, category: 'Hardware & Tools', subcategory: 'Abrasives & Brushes', brand: 'JZM', price: 1850, unit: 'pcs' },
  { name: 'Ouruisi Star Diamond Grinding Wheel', qty: 2, category: 'Hardware & Tools', subcategory: 'Abrasives & Brushes', brand: 'Ouruisi Star', price: 1650, unit: 'pcs' },
];

async function insertProductsBatch20() {
  console.log('🚀 Starting Batch 20 Product Insertion & Smart Stock Upsert...\n');

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
  console.log(`✅ BATCH 20 COMPLETE!`);
  console.log(`✨ New Products Created: ${insertedCount}`);
  console.log(`🔄 Existing Products Stock Added: ${updatedCount}`);
  console.log(`🏷️ HKU Series now at: HKU_${String(hkuIndex - 1).padStart(2, '0')}`);
  console.log(`==============================================\n`);
}

insertProductsBatch20()
  .catch(e => {
    console.error('❌ Error executing Batch 20:', e);
    process.exit(1);
  })
  .finally(async () => {
    if (prisma) await prisma.$disconnect();
    if (pool) await pool.end();
  });
