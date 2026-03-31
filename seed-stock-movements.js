import dotenv from 'dotenv';
import pg from 'pg';
import { randomUUID } from 'crypto';

dotenv.config();
const { Pool } = pg;

const dbHost = process.env.SUPABASE_DB_HOST;
const dbPort = Number(process.env.SUPABASE_DB_PORT ?? 6543);
const dbName = process.env.SUPABASE_DB_NAME ?? 'postgres';
const dbUser = process.env.SUPABASE_DB_USER;
const dbPassword = process.env.SUPABASE_DB_PASSWORD;
const dbUrl = process.env.DATABASE_URL;

if (!dbUrl && (!dbHost || !dbUser || !dbPassword)) {
  throw new Error(
    'Missing DB config. Provide DATABASE_URL or SUPABASE_DB_HOST, SUPABASE_DB_USER, SUPABASE_DB_PASSWORD',
  );
}

const pool = new Pool({
  ...(dbUrl
    ? { connectionString: dbUrl }
    : {
        host: dbHost,
        port: dbPort,
        database: dbName,
        user: dbUser,
        password: dbPassword,
      }),
  ssl: { rejectUnauthorized: false },
  connectionTimeoutMillis: 15000,
  idleTimeoutMillis: 30000,
});

async function seedStockMovementsData() {
  try {
    await pool.query('BEGIN');

    // Get existing tenant (ABC Hardware shop)
    const shopRes = await pool.query(
      `SELECT shop_id FROM shops WHERE shop_name = 'ABC Hardware' LIMIT 1`,
    );

    if (shopRes.rows.length === 0) {
      throw new Error(
        'ABC Hardware shop not found. Run seed.js first to create the shop.',
      );
    }

    const tenantId = shopRes.rows[0].shop_id;

    // Get user ID
    const userRes = await pool.query(
      `SELECT user_id FROM users WHERE email = 'john@abchardware.lk' LIMIT 1`,
    );

    if (userRes.rows.length === 0) {
      throw new Error('User not found. Run seed.js first.');
    }

    const userId = userRes.rows[0].user_id;

    // Seed categories
    const categoryRes = await pool.query(
      `INSERT INTO categories (category_id, tenant_id, category_name, category_code, is_active, created_at, updated_at)
       VALUES ($1, $2, 'Hardware', 'HW', true, now(), now())
       ON CONFLICT (tenant_id, category_code) DO NOTHING
       RETURNING category_id`,
      [randomUUID(), tenantId],
    );

    let categoryId = categoryRes.rows[0]?.category_id;
    if (!categoryId) {
      const getCat = await pool.query(
        `SELECT category_id FROM categories WHERE tenant_id = $1 AND category_code = 'HW' LIMIT 1`,
        [tenantId],
      );
      categoryId = getCat.rows[0].category_id;
    }

    // Seed brands
    const brandRes = await pool.query(
      `INSERT INTO brands (brand_id, tenant_id, brand_name, is_active, created_at, updated_at)
       VALUES ($1, $2, 'Premium Tools', true, now(), now())
       RETURNING brand_id`,
      [randomUUID(), tenantId],
    );

    let brandId = brandRes.rows[0]?.brand_id;
    if (!brandId) {
      const getBrand = await pool.query(
        `SELECT brand_id FROM brands WHERE tenant_id = $1 AND brand_name = 'Premium Tools' LIMIT 1`,
        [tenantId],
      );
      if (getBrand.rows.length > 0) {
        brandId = getBrand.rows[0].brand_id;
      } else {
        // If insert failed and query failed, insert again
        const retryBrand = await pool.query(
          `INSERT INTO brands (brand_id, tenant_id, brand_name, is_active, created_at, updated_at)
           VALUES ($1, $2, 'Premium Tools', true, now(), now())
           RETURNING brand_id`,
          [randomUUID(), tenantId],
        );
        brandId = retryBrand.rows[0].brand_id;
      }
    }

    // Seed units
    const unitRes = await pool.query(
      `INSERT INTO units (unit_id, tenant_id, unit_name, unit_code, is_active, created_at, updated_at)
       VALUES ($1, $2, 'Pieces', 'PCS', true, now(), now())
       ON CONFLICT (tenant_id, unit_code) DO NOTHING
       RETURNING unit_id`,
      [randomUUID(), tenantId],
    );

    let unitId = unitRes.rows[0]?.unit_id;
    if (!unitId) {
      const getUnit = await pool.query(
        `SELECT unit_id FROM units WHERE tenant_id = $1 AND unit_code = 'PCS' LIMIT 1`,
        [tenantId],
      );
      unitId = getUnit.rows[0].unit_id;
    }

    // Seed warehouses
    const wh1Id = randomUUID();
    const wh2Id = randomUUID();

    await pool.query(
      `INSERT INTO warehouses (warehouse_id, tenant_id, warehouse_name, warehouse_code, warehouse_type, is_active, created_at, updated_at)
       VALUES 
         ($1, $2, 'Main Store', 'WH-MAIN', 'main', true, now(), now()),
         ($3, $2, 'Branch Store', 'WH-BRANCH', 'branch_store', true, now(), now())
       ON CONFLICT (warehouse_code) DO NOTHING`,
      [wh1Id, tenantId, wh2Id],
    );

    // Get warehouse IDs (in case they already existed)
    const whRes = await pool.query(
      `SELECT warehouse_id, warehouse_code FROM warehouses WHERE tenant_id = $1 AND warehouse_code IN ('WH-MAIN', 'WH-BRANCH') ORDER BY warehouse_code`,
      [tenantId],
    );

    const mainWarehouseId = whRes.rows.find(
      (w) => w.warehouse_code === 'WH-MAIN',
    )?.warehouse_id;
    const branchWarehouseId = whRes.rows.find(
      (w) => w.warehouse_code === 'WH-BRANCH',
    )?.warehouse_id;

    if (!mainWarehouseId || !branchWarehouseId) {
      throw new Error('Failed to get warehouse IDs');
    }

    // Seed products
    const product1Id = randomUUID();
    const product2Id = randomUUID();

    await pool.query(
      `INSERT INTO products (product_id, tenant_id, product_name, sku, barcode, category_id, brand_id, unit_id, selling_price, tax_category, is_active, created_at, updated_at)
       VALUES 
         ($1, $2, 'Hammer Pro', 'SKU-HW-2026-000001', '8901234567890', $3, $4, $5, 45.99, 'standard_vat', true, now(), now()),
         ($6, $2, 'Drill Master', 'SKU-HW-2026-000002', '8901234567891', $3, $4, $5, 89.50, 'standard_vat', true, now(), now())
       ON CONFLICT (tenant_id, sku) DO NOTHING`,
      [product1Id, tenantId, categoryId, brandId, unitId, product2Id],
    );

    // Seed initial stock
    const stock1Id = randomUUID();
    const stock2Id = randomUUID();
    const stock3Id = randomUUID();

    await pool.query(
      `INSERT INTO stock (stock_id, tenant_id, product_id, warehouse_id, quantity, reserved_quantity, damaged_quantity, last_updated)
       VALUES 
         ($1, $2, $3, $4, 100.00, 10.00, 2.00, now()),
         ($5, $2, $6, $4, 50.00, 5.00, 1.00, now()),
         ($7, $2, $3, $8, 30.00, 5.00, 0.00, now())`,
      [
        stock1Id,
        tenantId,
        product1Id,
        mainWarehouseId,
        stock2Id,
        product2Id,
        stock3Id,
        branchWarehouseId,
      ],
    );

    // Seed stock movements (audit trail)
    const mov1Id = randomUUID();
    const mov2Id = randomUUID();
    const mov3Id = randomUUID();
    const mov4Id = randomUUID();
    const transferId = randomUUID();

    await pool.query(
      `INSERT INTO stock_movements (movement_id, tenant_id, product_id, warehouse_id, movement_type, quantity, before_quantity, after_quantity, unit_cost, total_cost, reference_type, reference_id, notes, created_by, created_at)
       VALUES 
         ($1, $2, $3, $4, 'in', 100.00, 0.00, 100.00, 25.50, 2550.00, 'PurchaseOrder', 'PO-001', 'Initial stock received', $5, now() - interval '5 days'),
         ($6, $2, $3, $4, 'out', -30.00, 100.00, 70.00, 45.99, 1379.70, 'SalesOrder', 'SO-001', 'Sold to customer', $5, now() - interval '3 days'),
         ($7, $2, $3, $4, 'transfer', -20.00, 70.00, 50.00, 25.50, 510.00, 'StockTransfer', $8, 'Transfer to branch', $5, now() - interval '1 day'),
         ($9, $2, $3, $10, 'transfer', 20.00, 10.00, 30.00, 25.50, 510.00, 'StockTransfer', $8, 'Received from main', $5, now() - interval '1 day')`,
      [
        mov1Id,
        tenantId,
        product1Id,
        mainWarehouseId,
        userId,
        mov2Id,
        mov3Id,
        transferId,
        mov4Id,
        branchWarehouseId,
      ],
    );

    // Seed stock transfer record (for Phase 4 testing)
    await pool.query(
      `INSERT INTO stock_transfers (transfer_id, tenant_id, transfer_number, from_warehouse_id, to_warehouse_id, transfer_date, status, notes, requested_by, approved_by, received_by, created_at, updated_at)
       VALUES ($1, $2, 'ST-2026-0001', $3, $4, CURRENT_DATE, 'received', 'Test transfer for audit trail', $5, $5, $5, now() - interval '1 day', now() - interval '1 day')
       ON CONFLICT (transfer_number) DO NOTHING`,
      [transferId, tenantId, mainWarehouseId, branchWarehouseId, userId],
    );

    // Seed transfer items
    const transferItemId = randomUUID();
    await pool.query(
      `INSERT INTO stock_transfer_items (transfer_item_id, transfer_id, product_id, quantity_requested, quantity_sent, quantity_received, unit_cost)
       VALUES ($1, $2, $3, 20.00, 20.00, 20.00, 25.50)`,
      [transferItemId, transferId, product1Id],
    );

    await pool.query('COMMIT');

    console.log(`✅ Stock Movements Test Data Seeded Successfully!\n`);
    console.log(`📊 Created Data Summary:`);
    console.log(`   Tenant ID: ${tenantId}`);
    console.log(`   User: john@abchardware.lk`);
    console.log(`\n📦 Products:`);
    console.log(`   1. Hammer Pro (${product1Id})`);
    console.log(`      SKU: SKU-HW-2026-000001`);
    console.log(`      Barcode: 8901234567890`);
    console.log(`   2. Drill Master (${product2Id})`);
    console.log(`      SKU: SKU-HW-2026-000002`);
    console.log(`      Barcode: 8901234567891`);
    console.log(`\n🏢 Warehouses:`);
    console.log(`   1. Main Store (${mainWarehouseId})`);
    console.log(`   2. Branch Store (${branchWarehouseId})`);
    console.log(`\n📝 Stock Movements Created:`);
    console.log(`   - 1 IN movement (Purchase Order PO-001)`);
    console.log(`   - 1 OUT movement (Sales Order SO-001)`);
    console.log(`   - 2 TRANSFER movements (linked to ${transferId})`);
    console.log(`\n🧪 Test Queries with Thunder Client:\n`);
    console.log(`   Login first:`);
    console.log(`   POST http://localhost:3000/auth/login`);
    console.log(
      `   { "email": "john@abchardware.lk", "password": "SecurePass@2026" }\n`,
    );
    console.log(`   Then copy access_token and use in these queries:\n`);
    console.log(`   1. Get All Movements:`);
    console.log(`      GET http://localhost:3000/stock-movements\n`);
    console.log(`   2. Filter by Product:`);
    console.log(
      `      GET http://localhost:3000/stock-movements?productId=${product1Id}\n`,
    );
    console.log(`   3. Filter by Movement Type (Transfers):`);
    console.log(
      `      GET http://localhost:3000/stock-movements?movementType=transfer\n`,
    );
    console.log(`   4. Filter by Warehouse:`);
    console.log(
      `      GET http://localhost:3000/stock-movements?warehouseId=${mainWarehouseId}\n`,
    );
    console.log(`   5. Trace a Transfer (Phase 4 - both movements):`);
    console.log(
      `      GET http://localhost:3000/stock-movements?referenceType=StockTransfer&referenceId=${transferId}\n`,
    );
    console.log(`   6. Date Range Filter:`);
    console.log(
      `      GET http://localhost:3000/stock-movements?startDate=2026-03-25&endDate=2026-03-31\n`,
    );
    console.log(`   7. Paginated Results:`);
    console.log(`      GET http://localhost:3000/stock-movements?limit=10\n`);
  } catch (error) {
    await pool.query('ROLLBACK').catch(() => undefined);

    if (error && typeof error === 'object' && 'code' in error) {
      if (error.code === 'ETIMEDOUT') {
        console.error(
          `❌ DB timeout to ${dbHost ?? 'DATABASE_URL host'}:${dbPort}. Check network/VPN/firewall.`,
        );
      }
    }

    console.error('❌ Seed Error:', error.message || error);
    throw error;
  } finally {
    await pool.end();
  }
}

seedStockMovementsData();
