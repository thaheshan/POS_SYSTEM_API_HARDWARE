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

async function revertScriptAttachedImages() {
  console.log(`Starting cleanup of auto-generated reference images...`);

  // Delete all ProductImage records with Unsplash CDN URLs (script-generated)
  const deleted = await prisma.productImage.deleteMany({
    where: {
      imageUrl: {
        contains: 'images.unsplash.com',
      },
    },
  });

  console.log(`\n🎉 REVERTED! Deleted ${deleted.count} auto-attached reference images. All your custom Supabase uploaded images remain 100% intact!`);
}

revertScriptAttachedImages()
  .catch(console.error)
  .finally(() => {
    prisma.$disconnect();
    if (pool) pool.end();
  });
