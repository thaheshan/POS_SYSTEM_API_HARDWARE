import { PrismaClient, TaxCategory } from '@prisma/client';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import * as dotenv from 'dotenv';

dotenv.config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log('🌱 Seeding database...');

  // 1. Create a Shop (Tenant)
  const shop = await prisma.shop.create({
    data: {
      name: 'Test Supermart',
      businessRegistration: 'REG-12345',
    },
  });
  console.log(`✅ Shop created: ${shop.id}`);

  // 2. Create a User
  // (Using a pre-calculated bcrypt hash for the password "password123")
  const user = await prisma.user.create({
    data: {
      tenant_id: shop.id,
      email: 'admin@test.com',
      password_hash:
        '$2a$12$uZp7qIeGIQ.8/w7/.MeNfuZf4R8ljI4EDhDXZ/3edF1St52cP6mg2', // password123
      first_name: 'System',
      last_name: 'Admin',
      role: 'OWNER',
      is_active: true,
      is_verified: true,
    },
  });
  console.log(`✅ User created: ${user.user_id}`);

  // 3. Create a Branch
  const branch = await prisma.branch.upsert({
    where: { code: 'BR-001' },
    update: {},
    create: {
      tenantId: shop.id,
      name: 'Main HQ',
      code: 'BR-001',
      managerId: user.user_id,
    },
  });

  console.log(`✅ Branch created: ${branch.id}`);

  // 4. Create a Warehouse
  const warehouse = await prisma.warehouse.create({
    data: {
      tenantId: shop.id,
      branchId: branch.id,
      name: 'Central Warehouse',
      code: 'WH-001',
    },
  });
  console.log(`✅ Warehouse created: ${warehouse.id}`);

  // 5. Create a Category & Brand
  const category = await prisma.category.create({
    data: { tenantId: shop.id, name: 'Electronics' },
  });

  // 6. Create a Test Product
  const product = await prisma.product.create({
    data: {
      tenantId: shop.id,
      categoryId: category.id,
      name: 'Wireless Mouse',
      sku: 'WM-001',
      sellingPrice: 25.99,
      minimumStockLevel: 10,
      taxCategory: TaxCategory.STANDARD_VAT,
    },
  });
  console.log(`✅ Product created: ${product.id}`);

  const stock = await prisma.stock.create({
    data: {
      tenantId: shop.id,
      productId: product.id,
      warehouseId: warehouse.id,
      branchId: branch.id,
      quantity: 0,
      reservedQuantity: 0,
      damagedQuantity: 0,
    },
  });
  console.log(`✅ Initial Stock record created: ${stock.id}`);

  console.log('\n🎉 Seeding complete! Copy these UUIDs for Postman:');
  console.log('--------------------------------------------------');
  console.log(`Tenant ID:    ${shop.id}`);
  console.log(`User ID:      ${user.user_id}`);
  console.log(`Warehouse ID: ${warehouse.id}`);
  console.log(`Product ID:   ${product.id}`);
}

main()
  .then(async () => {
    await prisma.$disconnect();
    console.log('🌱 Seeding completed!');
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
