require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const { Pool } = require('pg');

let prisma;
let pool;
try {
  pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
  const adapter = new PrismaPg(pool);
  prisma = new PrismaClient({ adapter });
} catch (e) {
  prisma = new PrismaClient();
}

async function main() {
  const shopId = '3924fc6c-27a4-470e-8e8a-ab67d4763b7a';
  
  const updated = await prisma.shop.update({
    where: { id: shopId },
    data: {
      name: 'Trinco Hardware & Electricals',
      businessRegistration: 'BR-2025-05139',
      phone: '+94763539351',
      email: 'trincohardware@gmail.com',
      address: 'Anuradapura Junction, Trincomalee, Sri Lanka',
      province: 'Eastern',
      district: 'Trincomalee',
      city: 'Trincomalee',
    },
  });

  console.log('✅ Shop profile updated successfully in DB:', updated);
}

main()
  .catch((e) => {
    console.error('❌ Failed to update shop profile:', e);
    process.exit(1);
  })
  .finally(async () => {
    if (prisma) await prisma.$disconnect();
    if (pool) await pool.end();
  });
