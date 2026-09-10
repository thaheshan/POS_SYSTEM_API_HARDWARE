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

// Clean, product-specific solo studio photos with white/isolated backgrounds
const exactImageMap = [
  // 1. PVC Fittings & Plumbing
  { keywords: ['ball valve'], url: 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?w=600&auto=format&fit=crop' },
  { keywords: ['thread seal', 'tape'], url: 'https://images.unsplash.com/photo-1621905251189-08b45d6a269e?w=600&auto=format&fit=crop' },
  { keywords: ['wash basin'], url: 'https://images.unsplash.com/photo-1584622650111-993a426fbf0a?w=600&auto=format&fit=crop' },
  { keywords: ['kitchen sink', 'sink'], url: 'https://images.unsplash.com/photo-1590490360182-c33d57733427?w=600&auto=format&fit=crop' },
  { keywords: ['bathroom door', 'door'], url: 'https://images.unsplash.com/photo-1517646287270-a5a9ca602e5c?w=600&auto=format&fit=crop' },
  { keywords: ['toilet lid', 'seat cover'], url: 'https://images.unsplash.com/photo-1585412727339-54e4bd3bbf91?w=600&auto=format&fit=crop' },
  { keywords: ['float valve'], url: 'https://images.unsplash.com/photo-1607472586893-edb57bdc0e39?w=600&auto=format&fit=crop' },
  { keywords: ['socket', 'elbow', 'tee', 'cap', 'pvc'], url: 'https://images.unsplash.com/photo-1607472586893-edb57bdc0e39?w=600&auto=format&fit=crop' },
  { keywords: ['pype', 'pipe', 'hose'], url: 'https://images.unsplash.com/photo-1542013936693-884638332954?w=600&auto=format&fit=crop' },

  // 2. Lighting & Electricals
  { keywords: ['solar street light', 'street light'], url: 'https://images.unsplash.com/photo-1509391365360-2e959784a276?w=600&auto=format&fit=crop' },
  { keywords: ['flood light', 'floodlight'], url: 'https://images.unsplash.com/photo-1565814636199-ae8133055c1c?w=600&auto=format&fit=crop' },
  { keywords: ['wall lamp', 'wall light'], url: 'https://images.unsplash.com/photo-1507473885765-e6ed057f782c?w=600&auto=format&fit=crop' },
  { keywords: ['pendant light', 'hanging lamp'], url: 'https://images.unsplash.com/photo-1513506003901-1e6a229e2d15?w=600&auto=format&fit=crop' },
  { keywords: ['downlight', 'down light', 'panel light', 'ice cube'], url: 'https://images.unsplash.com/photo-1563298723-dcfebaa392e3?w=600&auto=format&fit=crop' },
  { keywords: ['ufo lamp'], url: 'https://images.unsplash.com/photo-1565814636199-ae8133055c1c?w=600&auto=format&fit=crop' },
  { keywords: ['led bulb', 'eco led', 'stick led', 'candle bulb', 'bulb'], url: 'https://images.unsplash.com/photo-1550985616-10810253b84d?w=600&auto=format&fit=crop' },
  { keywords: ['ceiling rose'], url: 'https://images.unsplash.com/photo-1540932239986-30128078f3c5?w=600&auto=format&fit=crop' },
  { keywords: ['ceiling fan', 'fan'], url: 'https://images.unsplash.com/photo-1618944847828-82e943c3beb9?w=600&auto=format&fit=crop' },
  { keywords: ['ventilator'], url: 'https://images.unsplash.com/photo-1618944847828-82e943c3beb9?w=600&auto=format&fit=crop' },
  { keywords: ['holder', 'batten', 'plug top', 'plug', 'bell'], url: 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=600&auto=format&fit=crop' },
  { keywords: ['enclosure', 'mcb', 'switch box', 'sunk box', 'junction box'], url: 'https://images.unsplash.com/photo-1558494949-ef010cbdcc31?w=600&auto=format&fit=crop' },
  { keywords: ['water heater', 'heater'], url: 'https://images.unsplash.com/photo-1585338107529-13afc5f02586?w=600&auto=format&fit=crop' },

  // 3. Paints, Primers & Finishes
  { keywords: ['paint', 'exterior paint', 'interior paint', 'wallmaster', 'robbialac', 'berlux', 'berlex'], url: 'https://images.unsplash.com/photo-1589939705384-5185137a7f0f?w=600&auto=format&fit=crop' },
  { keywords: ['varnish', 'primer', 'sealer', 'polish', 'stainer'], url: 'https://images.unsplash.com/photo-1562259949-e8e7689d7828?w=600&auto=format&fit=crop' },
  { keywords: ['brush', 'roller'], url: 'https://images.unsplash.com/photo-1513467535987-fd81bc7d62f8?w=600&auto=format&fit=crop' },
  { keywords: ['sanding paper', 'waterproof paper', 'paper'], url: 'https://images.unsplash.com/photo-1504148455328-c376907d081c?w=600&auto=format&fit=crop' },

  // 4. Tools, Hardware & Equipment
  { keywords: ['tile cutter'], url: 'https://images.unsplash.com/photo-1504148455328-c376907d081c?w=600&auto=format&fit=crop' },
  { keywords: ['angle grinder', 'grinder', 'saw', 'grass cutter'], url: 'https://images.unsplash.com/photo-1572981779307-38b8cabb2407?w=600&auto=format&fit=crop' },
  { keywords: ['ladder'], url: 'https://images.unsplash.com/photo-1527515637462-cff94eecc1ac?w=600&auto=format&fit=crop' },
  { keywords: ['hammer', 'tongs', 'hoe', 'mammoties'], url: 'https://images.unsplash.com/photo-1586864387967-d02ef85d93e8?w=600&auto=format&fit=crop' },
  { keywords: ['gas cooker', 'cooker'], url: 'https://images.unsplash.com/photo-1556911220-e15b29be8c8f?w=600&auto=format&fit=crop' },
  { keywords: ['rat cage', 'trap', 'fastener', 'stay', 'nail', 'boots'], url: 'https://images.unsplash.com/photo-1581092335397-9583fe92d232?w=600&auto=format&fit=crop' },
];

async function attachExactProductImages() {
  const shops = await prisma.shop.findMany();
  let shop = shops.find(s => s.id.toLowerCase().includes('3924fc6c'));
  if (!shop && shops.length > 0) shop = shops[0];
  if (!shop) throw new Error('No shop found in database!');

  console.log(`Scanning products in Shop ${shop.id} for missing images...`);

  const products = await prisma.product.findMany({
    where: { tenantId: shop.id },
    include: { images: true },
    orderBy: { createdAt: 'asc' },
  });

  let addedCount = 0;
  let skippedCustomCount = 0;

  for (const prod of products) {
    // Check if product has a custom uploaded image (not unsplash)
    const hasCustomImage = prod.images && prod.images.some(img => img.imageUrl && !img.imageUrl.includes('unsplash.com'));

    if (hasCustomImage) {
      skippedCustomCount++;
      continue;
    }

    const nameLower = prod.name.toLowerCase();
    const matched = exactImageMap.find(entry => entry.keywords.some(kw => nameLower.includes(kw))) || exactImageMap[exactImageMap.length - 1];

    if (prod.images.length > 0) {
      // Update existing placeholder image to exact matched image
      await prisma.productImage.update({
        where: { id: prod.images[0].id },
        data: {
          imageUrl: matched.url,
          thumbnailUrl: matched.url,
          isPrimary: true,
        },
      });
    } else {
      // Create new solo product image
      await prisma.productImage.create({
        data: {
          productId: prod.id,
          imageUrl: matched.url,
          thumbnailUrl: matched.url,
          isPrimary: true,
          displayOrder: 1,
        },
      });
    }

    addedCount++;
    console.log(`[SOLO IMAGE ATTACHED] ${prod.sku} - "${prod.name}"`);
  }

  console.log(`\n🎉 COMPLETED!`);
  console.log(`• Solo product images attached/updated: ${addedCount}`);
  console.log(`• Custom local/Supabase uploaded images preserved: ${skippedCustomCount}`);
}

attachExactProductImages()
  .catch(console.error)
  .finally(() => {
    prisma.$disconnect();
    if (pool) pool.end();
  });
