import {
  PrismaClient,
  TaxCategory,
  SaleType,
  PaymentStatus,
  InvoiceStatus,
  AuditAction,
  SubscriptionPaymentStatus,
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
  console.log('🌱 Starting comprehensive database seed...');

  // 1. Create Shop (Tenant)
  const shop = await prisma.shop.create({
    data: {
      name: 'FUTURA HARDWARE',
      businessRegistration: 'BR-12345',
      email: 'thaheshanhamsu@gmail.com',
      subscriptionPlan: 'PRO',
      paymentStatus: SubscriptionPaymentStatus.PAID,
    },
  });
  console.log(`✅ Shop created: ${shop.name}`);

  // 2. Create Dynamic System Authorization Role
  const ownerRole = await prisma.role.create({
    data: {
      tenant_id: shop.id,
      name: 'OWNER',
      permissions: {},
    },
  });
  console.log(`✅ System Role initialized: ${ownerRole.name}`);

  // 3. Create Branch
  const branch = await prisma.branch.create({
    data: {
      tenantId: shop.id,
      name: 'Main Branch',
      code: 'MB-001',
    },
  });
  console.log(`✅ Branch mapped: ${branch.name}`);

  // 4. Create Warehouse
  const warehouse = await prisma.warehouse.create({
    data: {
      tenantId: shop.id,
      branchId: branch.id,
      name: 'Main Store',
      code: 'WH-001',
      address: '123 Main Street',
    },
  });
  console.log(`✅ Central Warehouse configured: ${warehouse.name}`);

  // 5. Create Owner User
  const passwordHash = await bcrypt.hash('Thaheshan0911@@', 10);
  const owner = await prisma.user.upsert({
    where: { email: 'thaheshanhamsu@gmail.com' },
    update: {
      password_hash: passwordHash,
      tenant_id: shop.id,
      role_id: ownerRole.id,
      first_name: 'suresh',
      last_name: 'somashantha thaheshan',
      is_active: true,
      is_verified: true,
      status: 'APPROVED',
    },
    create: {
      email: 'thaheshanhamsu@gmail.com',
      password_hash: passwordHash,
      tenant_id: shop.id,
      first_name: 'suresh',
      last_name: 'somashantha thaheshan',
      phone: '+94770000000',
      role_id: ownerRole.id,
      is_active: true,
      is_verified: true,
      status: 'APPROVED',
    },
  });
  console.log(`✅ Platform Owner created: ${owner.email}`);

  // 6. Categories (Aligned to hierarchical naming schemas)
  const categoriesData = [
    { name: 'Cement', code: 'CMNT' },
    { name: 'Steel', code: 'STEL' },
    { name: 'Tools', code: 'TOLS' },
    { name: 'Plumbing', code: 'PLMB' },
    { name: 'Electrical', code: 'ELEC' },
    { name: 'Paint', code: 'PNT' },
  ];
  const categories: Record<string, string> = {};
  for (const cat of categoriesData) {
    const createdCat = await prisma.category.create({
      data: {
        tenantId: shop.id,
        categoryName: cat.name,
        categoryCode: cat.code,
      },
    });
    categories[cat.name] = createdCat.id;
  }

  // 7. Brands (Aligned to layout properties)
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
      data: { tenantId: shop.id, brandName: brandName },
    });
    brands[brandName] = brand.id;
  }

  // 8. Units (Aligned to layout properties)
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
      data: { tenantId: shop.id, unitName: u.name, unitCode: u.abbr },
    });
    units[u.name] = unit.id;
  }

  // 9. Products & Inventory Distribution
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

  const createdProducts = [];
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

    const qty = randomInt(10, 100);
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
  console.log(
    `✅ Created ${createdProducts.length} catalog items with baseline stock maps.`,
  );

  // 10. Customers Seeding
  const customers = [];
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

  // 11. Generation of 3 Months of Historical Analytics Sales Data
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

      const itemsData = [];
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
  console.log(
    `✅ Distributed ${invoiceCount} historical sales invoices across 90 days.`,
  );

  // 12. Create a mock Audit Log entry (Preserving baseline tracking functionality)
  await prisma.auditLog.create({
    data: {
      tenantId: shop.id,
      userId: owner.user_id,
      action: AuditAction.UPDATE,
      entityType: 'stock',
      entityId: createdProducts[0].id,
      oldValues: { quantity: 50, availableQuantity: 50 },
      newValues: { quantity: 45, availableQuantity: 45 },
      ipAddress: '127.0.0.1',
      userAgent: 'NestJS-Seed-Engine',
    },
  });
  console.log('✅ Base Compliance log compiled smoothly.');
  console.log('\n🎉 System database seed completed successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Seeding process encountered a fatal error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    console.log('🌱 Service pooling connection gracefully released.');
  });
