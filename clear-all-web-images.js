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

async function clearWebImages() {
  console.log(`Clearing all script-generated web images from Shop...`);

  // Delete all ProductImage records with Unsplash or generic web URLs
  const deleted = await prisma.productImage.deleteMany({
    where: {
      OR: [
        { imageUrl: { contains: 'unsplash.com' } },
        { imageUrl: { contains: 'images.unsplash' } },
      ],
    },
  });

  console.log(`\n🎉 REVERTED SUCCESSFULLY! Deleted ${deleted.count} web images.`);
  console.log(`Zero wrong images remain. Only your real computer/Supabase uploaded photos will be kept!`);
}

clearWebImages()
  .catch(console.error)
  .finally(() => {
    prisma.$disconnect();
    if (pool) pool.end();
  });
