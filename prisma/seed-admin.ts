import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import * as bcrypt from 'bcrypt';
import * as dotenv from 'dotenv';
import * as crypto from 'crypto';
dotenv.config();

// Same SSL-enabled setup as seed.ts — required for Supabase connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log('Seeding Super Admin...');

  const adminEmail = process.env.SEED_ADMIN_EMAIL || 'admin@futurasolutions.com';
  let adminPassword = process.env.SEED_ADMIN_PASSWORD;
  if (!adminPassword) {
    adminPassword = crypto.randomBytes(12).toString('hex') + 'A1!';
    console.log(`[SEED] SEED_ADMIN_PASSWORD not set. Generated random password: ${adminPassword}`);
  }

  // 1. Create a system shop for the super admin (required by schema FK)
  let systemShop = await prisma.shop.findFirst({
    where: { name: 'SYSTEM_ADMIN_SHOP' }
  });

  if (!systemShop) {
    systemShop = await prisma.shop.create({
      data: {
        name: 'SYSTEM_ADMIN_SHOP',
        businessRegistration: 'SYS-000',
      }
    });
    console.log('Created system shop:', systemShop.id);
  } else {
    console.log('System shop already exists:', systemShop.id);
  }

  // 2. Create SUPER_ADMIN role for that shop if not exists
  let superAdminRole = await prisma.role.findFirst({
    where: { name: 'SUPER_ADMIN', tenant_id: systemShop.id }
  });

  if (!superAdminRole) {
    superAdminRole = await prisma.role.create({
      data: {
        name: 'SUPER_ADMIN',
        tenant_id: systemShop.id,
        permissions: { all: true }
      }
    });
    console.log('Created SUPER_ADMIN role:', superAdminRole.id);
  } else {
    console.log('SUPER_ADMIN role already exists:', superAdminRole.id);
  }

  // 3. Upsert the super admin user
  const passwordHash = await bcrypt.hash(adminPassword, 10);

  const admin = await prisma.user.upsert({
    where: { email: adminEmail },
    update: {
      password_hash: passwordHash,
      role_id: superAdminRole.id,
      tenant_id: systemShop.id,
      status: 'APPROVED',
      is_active: true,
      is_verified: true,
    },
    create: {
      email: adminEmail,
      password_hash: passwordHash,
      first_name: 'Super',
      last_name: 'Admin',
      phone: '+94770000001',
      role_id: superAdminRole.id,
      tenant_id: systemShop.id,
      status: 'APPROVED',
      is_active: true,
      is_verified: true,
    },
  });

  console.log('\n✅ Super admin seeded successfully!');
  console.log(`   Email   : ${adminEmail}`);
  console.log(`   Password: ${adminPassword}`);
  console.log('   User ID :', admin.user_id);
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
