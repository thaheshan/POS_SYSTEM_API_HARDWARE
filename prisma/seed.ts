import {
  PrismaClient,
  TaxCategory,
  SaleType,
  PaymentStatus,
  InvoiceStatus,
  AuditAction,
} from '@prisma/client';
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
  const user = await prisma.user.create({
    data: {
      tenant_id: shop.id,
      email: 'admin@test.com',
      password_hash:
        '$2a$12$uZp7qIeGIQ.8/w7/.MeNfuZf4R8ljI4EDhDXZ/3edF1St52cP6mg2', // password123
      first_name: 'System',
      last_name: 'Admin',
      role: 'admin',
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

  // 5. Create a Category
  const category = await prisma.category.create({
    data: {
      tenantId: shop.id,
      categoryName: 'Electronics',
      categoryCode: 'ELEC',
    },
  });

  // 6. Create a Test Product
  const product = await prisma.product.create({
    data: {
      tenantId: shop.id,
      categoryId: category.id,
      name: 'Wireless Mouse',
      sku: 'WM-001',
      sellingPrice: 100.0,
      minimumStockLevel: 10,
      taxCategory: TaxCategory.STANDARD_VAT,
    },
  });
  console.log(`✅ Product created: ${product.id}`);

  // 7. Create Initial Stock
  const stock = await prisma.stock.create({
    data: {
      tenantId: shop.id,
      productId: product.id,
      warehouseId: warehouse.id,
      branchId: branch.id,
      quantity: 10,
      reservedQuantity: 0,
      damagedQuantity: 0,
    },
  });
  console.log(`✅ Initial Stock record created: ${stock.id}`);

  // ==========================================
  // NEW CODE: Setup Return Scenario Data
  // ==========================================

  // 8. Create a Customer with an Outstanding Balance
  const customer = await prisma.customer.create({
    data: {
      tenantId: shop.id,
      name: 'John Doe',
      phone: '555-0199',
      outstandingBalance: 110.0,
      totalPurchases: 110.0,
    },
  });
  console.log(`✅ Customer created: ${customer.id}`);

  // 9. Create a Credit Sales Invoice
  const invoice = await prisma.salesInvoice.create({
    data: {
      tenantId: shop.id,
      branchId: branch.id,
      // customerId: customer.id,
      cashierId: user.user_id,
      invoiceNumber: 'INV-TEST-001',
      invoiceDate: new Date(), // Required by schema
      invoiceTime: new Date(), // Required by schema
      saleType: SaleType.CREDIT, // Enum required
      paymentStatus: PaymentStatus.UNPAID, // Enum required
      status: InvoiceStatus.COMPLETED, // Enum required
      subtotal: 100.0,
      taxAmount: 10.0,
      totalAmount: 110.0,
    },
  });
  console.log(`✅ Credit Invoice created: ${invoice.id}`);

  // 10. Create the Sales Invoice Item
  const invoiceItem = await prisma.salesInvoiceItem.create({
    data: {
      invoiceId: invoice.id,
      productId: product.id,
      warehouseId: warehouse.id, // Required by schema
      quantity: 1,
      unitPrice: 100.0,
      lineTotal: 100.0,
    },
  });
  console.log(`✅ Invoice Item created: ${invoiceItem.id}`);

  // ==========================================
  // 11. Create a mock Audit Log for testing
  // ==========================================
  const auditLog = await prisma.auditLog.create({
    data: {
      tenantId: shop.id,
      userId: user.user_id,
      action: AuditAction.UPDATE,
      entityType: 'stock',
      entityId: stock.id,
      oldValues: { quantity: 15, availableQuantity: 15 },
      newValues: { quantity: 10, availableQuantity: 10 },
      ipAddress: '127.0.0.1',
      userAgent: 'PostmanRuntime/7.39.0',
    },
  });
  console.log(`✅ Audit Log created: ${auditLog.id}`);
  // ==========================================

  console.log('\n🎉 Seeding complete! Copy these UUIDs for Postman:');
  console.log('--------------------------------------------------');
  console.log(`"tenantId":      "${shop.id}"`);
  console.log(`"branchId":      "${branch.id}"`);
  console.log(`"customerId":    "${customer.id}"`);
  console.log(`"invoiceId":     "${invoice.id}"`);
  console.log(`"invoiceItemId": "${invoiceItem.id}"`);
  console.log(`"productId":     "${product.id}"`);
  console.log(`"warehouseId":   "${warehouse.id}"`);
  console.log(`"auditLogId":    "${auditLog.id}"`);
  console.log('--------------------------------------------------');
}

main()
  .then(async () => {
    await prisma.$disconnect();
    console.log('🌱 Seeding process finished gracefully.');
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
