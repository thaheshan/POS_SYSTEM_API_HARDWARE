import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
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
  console.log('Starting data recovery script to restore Owner privileges...');

  const shops = await prisma.shop.findMany();

  for (const shop of shops) {
    console.log(`Processing shop: ${shop.name} (${shop.id})`);

    // Create the OWNER role for this shop
    const role = await prisma.role.create({
      data: {
        name: 'OWNER',
        permissions: { all: true },
        tenant_id: shop.id,
      },
    });

    console.log(`Created OWNER role with ID: ${role.id}`);

    let user: any = null;
    
    if (shop.email) {
      user = await prisma.user.findFirst({
        where: { email: shop.email, tenant_id: shop.id },
      });
    }

    if (!user) {
      user = await prisma.user.findFirst({
        where: { tenant_id: shop.id },
        orderBy: { created_at: 'asc' },
      });
    }

    if (user) {
      await prisma.user.update({
        where: { user_id: user.user_id },
        data: { role_id: role.id },
      });
      console.log(`Restored OWNER privileges for user: ${user.email}`);
    } else {
      console.log(`No users found for shop ${shop.name} to restore.`);
    }
  }

  console.log('Recovery script completed successfully!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
