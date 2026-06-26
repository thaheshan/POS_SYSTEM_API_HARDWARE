import {
  PrismaClient,
  TaxCategory,
  SaleType,
  PaymentStatus,
  InvoiceStatus,
  SubscriptionPaymentStatus,
  StaffStatus,
  Product,
} from '@prisma/client';

import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import * as bcrypt from 'bcrypt';
import * as dotenv from 'dotenv';
dotenv.config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

function randomDate(start: Date, end: Date) {
  return new Date(
    start.getTime() + Math.random() * (end.getTime() - start.getTime()),
  );
}

function randomInt(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

async function main() {
  console.log('Starting seed...');

  if (!process.env.SEED_OWNER_PASSWORD) {
    throw new Error(
      'SEED_OWNER_PASSWORD environment variable is required for seeding!',
    );
  }

  if (!process.env.SEED_OWNER_EMAIL) {
    throw new Error(
      'SEED_OWNER_EMAIL environment variable is required for seeding!',
    );
  }

  // Pull secure credentials from environment variables
  const ownerEmail = process.env.SEED_OWNER_EMAIL;
  const ownerPassword = process.env.SEED_OWNER_PASSWORD;

  // 1. Create or Find Shop (findFirst fallback because Shop lacks a unique constraint)
  let shop = await prisma.shop.findFirst({
    where: { name: 'FUTURA HARDWARE' },
  });

  if (!shop) {
    shop = await prisma.shop.create({
      data: {
        name: 'FUTURA HARDWARE',
        businessRegistration: 'BR-12345',
        email: ownerEmail,
        subscriptionPlan: 'PRO',
        paymentStatus: SubscriptionPaymentStatus.PAID,
      },
    });
    console.log(`Created shop: ${shop.name}`);
  } else {
    console.log(`Found existing shop: ${shop.name}`);
  }

  // 2. Create or Update Branch (upsert using unique code)
  const branch = await prisma.branch.upsert({
    where: { code: 'MB-001' },
    update: { tenantId: shop.id, name: 'Main Branch' },
    create: { tenantId: shop.id, name: 'Main Branch', code: 'MB-001' },
  });

  // 3. Create or Update Warehouse (upsert using unique code)
  const warehouse = await prisma.warehouse.upsert({
    where: { code: 'WH-001' },
    update: {
      tenantId: shop.id,
      branchId: branch.id,
      name: 'Main Store',
      address: '123 Main Street',
    },
    create: {
      tenantId: shop.id,
      branchId: branch.id,
      name: 'Main Store',
      code: 'WH-001',
      address: '123 Main Street',
    },
  });

  // 4. Create or Find the OWNER Role
  let ownerRole = await prisma.role.findFirst({
    where: { name: 'OWNER', tenant_id: shop.id },
  });

  if (!ownerRole) {
    ownerRole = await prisma.role.create({
      data: { name: 'OWNER', tenant_id: shop.id, permissions: {} },
    });
    console.log(`Created role: ${ownerRole.name}`);
  }

  // 5. Create or Update Owner User
  const passwordHash = await bcrypt.hash(ownerPassword, 10);
  const owner = await prisma.user.upsert({
    where: { email: ownerEmail },
    update: {
      password_hash: passwordHash,
      tenant_id: shop.id,
      role_id: ownerRole.id,
      first_name: 'System',
      last_name: 'Owner',
      is_active: true,
      is_verified: true,
      status: StaffStatus.APPROVED,
    },
    create: {
      email: ownerEmail,
      password_hash: passwordHash,
      tenant_id: shop.id,
      first_name: 'System',
      last_name: 'Owner',
      phone: '+94770000000',
      role_id: ownerRole.id,
      is_active: true,
      is_verified: true,
      status: StaffStatus.APPROVED,
    },
  });
  console.log(`Owner ready: ${owner.email}`);

  // Categories (ADAPTED: Category model uses name field instead of categoryName)
  const categoriesData = [
    'Cement',
    'Steel',
    'Tools',
    'Plumbing',
    'Electrical',
    'Paint',
  ];
  const categories: Record<string, string> = {};
  for (const catName of categoriesData) {
    const cat = await prisma.category.create({
      data: {
        tenantId: shop.id,
        name: catName,
      },
    });
    categories[catName] = cat.id;
  }

  // Brands (ADAPTED: Brand model uses name field instead of brandName)
  const brandsData = [
    'Holcim',
    'Tokyo Super',
    'Bosch',
    'Stanley',
    'Asian Paint',
  ];
  const brands: Record<string, string> = {};
  for (const brandName of brandsData) {
    const brand = await prisma.brand.create({
      data: { tenantId: shop.id, name: brandName },
    });
    brands[brandName] = brand.id;
  }

  // Units (ADAPTED: Unit model uses name and abbreviation fields instead of unitName and unitCode)
  const unitsData = [
    { name: 'Kilogram', abbr: 'kg' },
    { name: 'Piece', abbr: 'pcs' },
    { name: 'Liter', abbr: 'L' },
    { name: 'Meter', abbr: 'm' },
    { name: 'Roll', abbr: 'roll' },
  ];
  const units: Record<string, string> = {};
  for (const u of unitsData) {
    const unit = await prisma.unit.create({
      data: { tenantId: shop.id, name: u.name, abbreviation: u.abbr },
    });
    units[u.name] = unit.id;
  }

  // Products
  const productsData = [
    {
      name: 'Holcim Cement 50kg',
      sku: 'HCM-50-001',
      category: 'Cement',
      brand: 'Holcim',
      unit: 'Kilogram',
      price: 1650,
      cost: 1400,
    },
    {
      name: 'Tokyo Super Cement',
      sku: 'TKY-50-002',
      category: 'Cement',
      brand: 'Tokyo Super',
      unit: 'Kilogram',
      price: 1720,
      cost: 1500,
    },
    {
      name: 'Steel Rods 12mm',
      sku: 'STL-12-002',
      category: 'Steel',
      brand: null,
      unit: 'Piece',
      price: 2450,
      cost: 2000,
    },
    {
      name: 'Steel Rods 16mm',
      sku: 'STL-16-003',
      category: 'Steel',
      brand: null,
      unit: 'Piece',
      price: 3200,
      cost: 2600,
    },
    {
      name: 'Bosch Power Drill 18V',
      sku: 'BSH-DR-001',
      category: 'Tools',
      brand: 'Bosch',
      unit: 'Piece',
      price: 14500,
      cost: 12000,
    },
    {
      name: 'Stanley Hammer 20oz',
      sku: 'STY-HM-005',
      category: 'Tools',
      brand: 'Stanley',
      unit: 'Piece',
      price: 1850,
      cost: 1500,
    },
    {
      name: 'PVC Pipe 2 inch (10ft)',
      sku: 'PVC-2I-005',
      category: 'Plumbing',
      brand: null,
      unit: 'Piece',
      price: 1850,
      cost: 1400,
    },
    {
      name: 'Water Tap Brass 1/2"',
      sku: 'TAP-BR-001',
      category: 'Plumbing',
      brand: null,
      unit: 'Piece',
      price: 1250,
      cost: 900,
    },
    {
      name: 'Circuit Breaker 32A',
      sku: 'ELE-CB-032',
      category: 'Electrical',
      brand: null,
      unit: 'Piece',
      price: 2100,
      cost: 1700,
    },
    {
      name: 'Copper Wire 1.5mm 1Roll',
      sku: 'ELE-WR-015',
      category: 'Electrical',
      brand: null,
      unit: 'Roll',
      price: 5800,
      cost: 4500,
    },
    {
      name: 'Asian Paint White 4L',
      sku: 'PNT-WH-003',
      category: 'Paint',
      brand: 'Asian Paint',
      unit: 'Liter',
      price: 3200,
      cost: 2500,
    },
    {
      name: 'Paint Roller 9 inch',
      sku: 'PNT-RL-009',
      category: 'Paint',
      brand: null,
      unit: 'Piece',
      price: 850,
      cost: 500,
    },
    {
      name: 'Nails 3 inch (1kg)',
      sku: 'NLS-3I-004',
      category: 'Tools',
      brand: null,
      unit: 'Kilogram',
      price: 450,
      cost: 300,
    },
  ];

  const createdProducts: Product[] = [];
  for (const pd of productsData) {
    const p = await prisma.product.create({
      data: {
        tenantId: shop.id,
        name: pd.name,
        sku: pd.sku,
        categoryId: categories[pd.category],
        brandId: pd.brand ? brands[pd.brand] : null,
        unitId: units[pd.unit],
        purchasePrice: pd.cost,
        sellingPrice: pd.price,
        minimumStockLevel: 5,
        isActive: true,
        createdBy: owner.user_id,
        taxCategory: TaxCategory.STANDARD_VAT,
      },
    });
    createdProducts.push(p);

    // Initial Stock
    const qty = randomInt(10, 100);
    if (qty < 15) {
      await prisma.stock.create({
        data: {
          tenantId: shop.id,
          productId: p.id,
          warehouseId: warehouse.id,
          branchId: branch.id,
          quantity: randomInt(1, 4),
          availableQuantity: randomInt(1, 4),
        },
      });
    } else {
      await prisma.stock.create({
        data: {
          tenantId: shop.id,
          productId: p.id,
          warehouseId: warehouse.id,
          branchId: branch.id,
          quantity: qty,
          availableQuantity: qty,
        },
      });
    }
  }
  console.log(`Created ${createdProducts.length} products with stock.`);

  // Customers
  const customers: any[] = [];
  for (let i = 1; i <= 15; i++) {
    const c = await prisma.customer.create({
      data: {
        tenantId: shop.id,
        name: `Customer ${i}`,
        phone: `077123456${i % 10}`,
        outstandingBalance: 0,
      },
    });
    customers.push(c);
  }

  // Generate 3 months of Sales Data
  const endDate = new Date();
  const startDate = new Date();
  startDate.setMonth(startDate.getMonth() - 3);

  let invoiceCount = 0;
  const days = 90;

  for (let d = 0; d < days; d++) {
    const currentDay = new Date(startDate);
    currentDay.setDate(startDate.getDate() + d);

    const dailySales = randomInt(1, 5);
    for (let s = 0; s < dailySales; s++) {
      const saleTime = new Date(currentDay);
      saleTime.setHours(randomInt(8, 18), randomInt(0, 59));

      const numItems = randomInt(1, 4);
      let subtotal = 0;
      const invoiceNumber = `INV-${d}-${s}-${randomInt(1000, 9999)}`;

      const itemsData: any[] = [];
      for (let i = 0; i < numItems; i++) {
        const prod = createdProducts[randomInt(0, createdProducts.length - 1)];
        const qty = randomInt(1, 5);
        const unitPrice = Number(prod.sellingPrice);
        const costPrice = Number(prod.purchasePrice);
        const lineTotal = unitPrice * qty;
        subtotal += lineTotal;

        itemsData.push({
          productId: prod.id,
          productName: prod.name,
          quantity: qty,
          unitPrice,
          lineTotal,
          costPrice,
          profit: lineTotal - costPrice * qty,
          warehouseId: warehouse.id,
        });
      }

      await prisma.salesInvoice.create({
        data: {
          tenantId: shop.id,
          branchId: branch.id,
          customerId: customers[randomInt(0, customers.length - 1)].id,
          invoiceNumber,
          invoiceDate: saleTime,
          invoiceTime: saleTime,
          saleType: SaleType.CASH,
          subtotal,
          totalAmount: subtotal,
          paidAmount: subtotal,
          balance: 0,
          paymentStatus: PaymentStatus.PAID,
          status: InvoiceStatus.COMPLETED,
          cashierId: owner.user_id,
          createdAt: saleTime,
          items: {
            create: itemsData,
          },
        },
      });
      invoiceCount++;
    }
  }
  console.log(`Generated ${invoiceCount} sales invoices over 3 months.`);

  console.log('Seeding completed successfully!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
