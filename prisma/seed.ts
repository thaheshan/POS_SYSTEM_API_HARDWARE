import {
  PrismaClient,
  TaxCategory,
  SaleType,
  PaymentStatus,
  InvoiceStatus,
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
  console.log('Seeding database...');

  // 1) Shop (no unique in schema, so use findFirst fallback)
  let shop = await prisma.shop.findFirst({
    where: {
      name: 'Test Supermart',
      businessRegistration: 'REG-12345',
    },
  });

  if (!shop) {
    shop = await prisma.shop.create({
      data: {
        name: 'Test Supermart',
        businessRegistration: 'REG-12345',
      },
    });
  }

  console.log('Shop ready: ' + shop.id);

  // 2) User (email is unique)
  const user = await prisma.user.upsert({
    where: { email: 'admin@test.com' },
    update: {
      tenant_id: shop.id,
      first_name: 'System',
      last_name: 'Admin',
      role: 'admin',
      is_active: true,
      is_verified: true,
    },
    create: {
      tenant_id: shop.id,
      email: 'admin@test.com',
      password_hash:
        '$2a$12$uZp7qIeGIQ.8/w7/.MeNfuZf4R8ljI4EDhDXZ/3edF1St52cP6mg2',
      first_name: 'System',
      last_name: 'Admin',
      role: 'admin',
      is_active: true,
      is_verified: true,
    },
  });

  console.log('User ready: ' + user.user_id);

  // 3) Branch (code is unique)
  const branch = await prisma.branch.upsert({
    where: { code: 'BR-001' },
    update: {
      tenantId: shop.id,
      name: 'Main HQ',
      managerId: user.user_id,
      isActive: true,
    },
    create: {
      tenantId: shop.id,
      name: 'Main HQ',
      code: 'BR-001',
      managerId: user.user_id,
      isActive: true,
    },
  });

  console.log('Branch ready: ' + branch.id);

  // 4) Warehouse (code is unique)
  const warehouse = await prisma.warehouse.upsert({
    where: { code: 'WH-001' },
    update: {
      tenantId: shop.id,
      branchId: branch.id,
      name: 'Central Warehouse',
      isActive: true,
    },
    create: {
      tenantId: shop.id,
      branchId: branch.id,
      name: 'Central Warehouse',
      code: 'WH-001',
      isActive: true,
    },
  });

  console.log('Warehouse ready: ' + warehouse.id);

  // 5) Category (composite unique: tenantId + categoryCode)
  const category = await prisma.category.upsert({
    where: {
      tenantId_categoryCode: {
        tenantId: shop.id,
        categoryCode: 'ELEC',
      },
    },
    update: {
      categoryName: 'Electronics',
      isActive: true,
    },
    create: {
      tenantId: shop.id,
      categoryName: 'Electronics',
      categoryCode: 'ELEC',
      isActive: true,
    },
  });

  console.log('Category ready: ' + category.id);

  // 6) Product (composite unique: tenantId + sku)
  const product = await prisma.product.upsert({
    where: {
      tenantId_sku: {
        tenantId: shop.id,
        sku: 'WM-001',
      },
    },
    update: {
      categoryId: category.id,
      name: 'Wireless Mouse',
      sellingPrice: 25.99,
      minimumStockLevel: 10,
      taxCategory: TaxCategory.STANDARD_VAT,
      isActive: true,
      createdBy: user.user_id,
    },
    create: {
      tenantId: shop.id,
      categoryId: category.id,
      name: 'Wireless Mouse',
      sku: 'WM-001',
      sellingPrice: 25.99,
      minimumStockLevel: 10,
      taxCategory: TaxCategory.STANDARD_VAT,
      isActive: true,
      createdBy: user.user_id,
    },
  });

  console.log('Product ready: ' + product.id);

  // 7) Stock (composite unique: productId + variantId + warehouseId)
  // 7) Stock (avoid upsert on composite key with nullable variantId)
  let stock = await prisma.stock.findFirst({
    where: {
      productId: product.id,
      variantId: null,
      warehouseId: warehouse.id,
    },
  });

  if (!stock) {
    stock = await prisma.stock.create({
      data: {
        tenantId: shop.id,
        productId: product.id,
        variantId: null,
        warehouseId: warehouse.id,
        branchId: branch.id,
        quantity: 10,
        reservedQuantity: 0,
        damagedQuantity: 0,
      },
    });
  } else {
    stock = await prisma.stock.update({
      where: { id: stock.id },
      data: {
        tenantId: shop.id,
        branchId: branch.id,
        quantity: 10,
        reservedQuantity: 0,
        damagedQuantity: 0,
      },
    });
  }

  console.log('Stock ready: ' + stock.id);

  // 8) Customer (no unique in schema, so use findFirst fallback)
  let customer = await prisma.customer.findFirst({
    where: {
      tenantId: shop.id,
      name: 'John Doe',
      phone: '555-0199',
    },
  });

  if (!customer) {
    customer = await prisma.customer.create({
      data: {
        tenantId: shop.id,
        name: 'John Doe',
        phone: '555-0199',
        outstandingBalance: 110.0,
        totalPurchases: 110.0,
      },
    });
  } else {
    customer = await prisma.customer.update({
      where: { id: customer.id },
      data: {
        outstandingBalance: 110.0,
        totalPurchases: 110.0,
      },
    });
  }

  console.log('Customer ready: ' + customer.id);

  // 9) Sales Invoice (invoiceNumber is unique)
  const invoice = await prisma.salesInvoice.upsert({
    where: { invoiceNumber: 'INV-TEST-001' },
    update: {
      tenantId: shop.id,
      branchId: branch.id,
      customerId: customer.id,
      cashierId: user.user_id,
      invoiceDate: new Date(),
      invoiceTime: new Date(),
      saleType: SaleType.CREDIT,
      paymentStatus: PaymentStatus.UNPAID,
      status: InvoiceStatus.COMPLETED,
      subtotal: 100.0,
      taxAmount: 10.0,
      totalAmount: 110.0,
    },
    create: {
      tenantId: shop.id,
      branchId: branch.id,
      customerId: customer.id,
      cashierId: user.user_id,
      invoiceNumber: 'INV-TEST-001',
      invoiceDate: new Date(),
      invoiceTime: new Date(),
      saleType: SaleType.CREDIT,
      paymentStatus: PaymentStatus.UNPAID,
      status: InvoiceStatus.COMPLETED,
      subtotal: 100.0,
      taxAmount: 10.0,
      totalAmount: 110.0,
    },
  });

  console.log('Invoice ready: ' + invoice.id);

  // 10) SalesInvoiceItem (no unique in schema, use findFirst + update/create)
  let invoiceItem = await prisma.salesInvoiceItem.findFirst({
    where: {
      invoiceId: invoice.id,
      productId: product.id,
      variantId: null,
      warehouseId: warehouse.id,
    },
  });

  if (!invoiceItem) {
    invoiceItem = await prisma.salesInvoiceItem.create({
      data: {
        invoiceId: invoice.id,
        productId: product.id,
        variantId: null,
        warehouseId: warehouse.id,
        quantity: 1,
        unitPrice: 100.0,
        lineTotal: 100.0,
      },
    });
  } else {
    invoiceItem = await prisma.salesInvoiceItem.update({
      where: { id: invoiceItem.id },
      data: {
        quantity: 1,
        unitPrice: 100.0,
        lineTotal: 100.0,
      },
    });
  }

  console.log('Invoice item ready: ' + invoiceItem.id);

  console.log('');
  console.log('Seeding complete. UUIDs for testing:');
  console.log('tenantId: ' + shop.id);
  console.log('branchId: ' + branch.id);
  console.log('customerId: ' + customer.id);
  console.log('invoiceId: ' + invoice.id);
  console.log('invoiceItemId: ' + invoiceItem.id);
  console.log('productId: ' + product.id);
  console.log('warehouseId: ' + warehouse.id);
}

main()
  .then(async () => {
    await prisma.$disconnect();
    await pool.end();
    console.log('Seed process finished gracefully.');
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    await pool.end();
    process.exit(1);
  });
