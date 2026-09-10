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

async function revertImageChanges() {
  console.log(`Starting 1-click revert of script-attached product images...`);

  // Only delete images that contain unsplash.com (CDN solo images)
  const deleted = await prisma.productImage.deleteMany({
    where: {
      imageUrl: {
        contains: 'unsplash.com',
      },
    },
  });

  console.log(`\n🎉 REVERT SUCCESSFUL! Deleted ${deleted.count} script-attached reference images.`);
  console.log(`All your custom computer/Supabase uploaded images remain 100% intact!`);
}

revertImageChanges()
  .catch(console.error)
  .finally(() => {
    prisma.$disconnect();
    if (pool) pool.end();
  });
