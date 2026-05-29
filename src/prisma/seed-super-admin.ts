import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import * as bcrypt from 'bcrypt';
import * as dotenv from 'dotenv';
dotenv.config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

const prisma = new PrismaClient({
  adapter: new PrismaPg(pool),
});

async function main() {
  const email = 'admin@futurasolutions.com';
  const password = 'SuperAdminPassword123!@';

  const existingAdmin = await prisma.user.findUnique({
    where: { email }
  });

  if (existingAdmin) {
    console.log('Super Admin already exists.');
    return;
  }

  const hashedPassword = await bcrypt.hash(password, 10);

  // Super Admin has no tenant/shop, so role_id is null
  const admin = await prisma.user.create({
    data: {
      email,
      password_hash: hashedPassword,
      first_name: 'Futura',
      last_name: 'Solutions',
      // Super admin has no tenant, role_id is left null
      status: 'APPROVED',
      is_active: true,
      is_verified: true,
    },
  });

  console.log('Successfully created Super Admin account:');
  console.log(`Email: ${admin.email}`);
  console.log(`Password: ${password}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
