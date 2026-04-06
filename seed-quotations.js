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

async function seedQuotationsData() {
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

    // Get or create customers
    const customer1 = 'John Contractor';
    const customer1Code = 'CUST-001';
    const customer1Phone = '0711234567';
    const customer2 = 'ABC Building Corp';
    const customer2Code = 'CUST-002';
    const customer2Phone = '0751234567';

    let customerId1;
    let customerId2;

    // Check if customers exist, otherwise create them
    const cust1Res = await pool.query(
      `SELECT customer_id FROM customers WHERE tenant_id = $1 AND customer_code = $2 LIMIT 1`,
      [tenantId, customer1Code],
    );

    if (cust1Res.rows.length === 0) {
      const insertCust1 = await pool.query(
        `INSERT INTO customers (customer_id, tenant_id, customer_code, customer_name, phone, customer_type, is_active, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, 'individual', true, now(), now())
         RETURNING customer_id`,
        [randomUUID(), tenantId, customer1Code, customer1, customer1Phone],
      );
      customerId1 = insertCust1.rows[0].customer_id;
    } else {
      customerId1 = cust1Res.rows[0].customer_id;
    }

    const cust2Res = await pool.query(
      `SELECT customer_id FROM customers WHERE tenant_id = $1 AND customer_code = $2 LIMIT 1`,
      [tenantId, customer2Code],
    );

    if (cust2Res.rows.length === 0) {
      const insertCust2 = await pool.query(
        `INSERT INTO customers (customer_id, tenant_id, customer_code, customer_name, phone, customer_type, is_active, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, 'business', true, now(), now())
         RETURNING customer_id`,
        [randomUUID(), tenantId, customer2Code, customer2, customer2Phone],
      );
      customerId2 = insertCust2.rows[0].customer_id;
    } else {
      customerId2 = cust2Res.rows[0].customer_id;
    }

    // Get existing products for quotation items
    const productsRes = await pool.query(
      `SELECT product_id, product_name, selling_price FROM products WHERE tenant_id = $1 LIMIT 2`,
      [tenantId],
    );

    if (productsRes.rows.length < 2) {
      throw new Error('Not enough products found. Run seed.js first.');
    }

    const product1 = productsRes.rows[0];
    const product2 = productsRes.rows[1];

    // Helper function to generate QUO number
    function generateQuoNumber(year, sequence) {
      const paddedSeq = String(sequence).padStart(5, '0');
      return `QUO-${year}-${paddedSeq}`;
    }

    const currentYear = new Date().getFullYear();
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Get current quotation count for year
    const countRes = await pool.query(
      `SELECT COUNT(*) as count FROM quotations WHERE tenant_id = $1 AND EXTRACT(YEAR FROM created_at) = $2`,
      [tenantId, currentYear],
    );
    const nextSeq = (countRes.rows[0].count || 0) + 1;

    // === QUOTATION 1: DRAFT ===
    const quo1Id = randomUUID();
    const quo1Number = generateQuoNumber(currentYear, nextSeq);
    const validUntil1 = new Date(today);
    validUntil1.setDate(validUntil1.getDate() + 30);

    await pool.query(
      `INSERT INTO quotations (
         quotation_id, tenant_id, quotation_number, quotation_date, valid_until,
         customer_id, customer_name, customer_phone,
         subtotal, discount_amount, tax_amount, total_amount,
         status, notes, terms_conditions, created_by, created_at, updated_at
       ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, now(), now())`,
      [
        quo1Id,
        tenantId,
        quo1Number,
        today,
        validUntil1,
        customerId1,
        customer1,
        customer1Phone,
        5000.0, // subtotal
        0, // discount
        750.0, // tax (15%)
        5750.0, // total
        'draft',
        'Initial quote for electrical cables project',
        'Valid for 30 days. Payment terms: Net 30. 50% advance required.',
        userId,
      ],
    );

    // Quotation 1 Items
    await pool.query(
      `INSERT INTO quotation_items (
         quotation_item_id, quotation_id, product_id, product_name,
         quantity, unit_price, discount_percentage, tax_rate, line_total
       ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [
        randomUUID(),
        quo1Id,
        product1.product_id,
        product1.product_name,
        100, // 100 meters
        50.0,
        null,
        15,
        5750.0,
      ],
    );

    // === QUOTATION 2: ACCEPTED ===
    const quo2Id = randomUUID();
    const quo2Number = generateQuoNumber(currentYear, nextSeq + 1);
    const validUntil2 = new Date(today);
    validUntil2.setDate(validUntil2.getDate() + 30);

    await pool.query(
      `INSERT INTO quotations (
         quotation_id, tenant_id, quotation_number, quotation_date, valid_until,
         customer_id, customer_name, customer_phone,
         subtotal, discount_amount, tax_amount, total_amount,
         status, notes, terms_conditions, created_by, created_at, updated_at
       ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, now(), now())`,
      [
        quo2Id,
        tenantId,
        quo2Number,
        today,
        validUntil2,
        customerId2,
        customer2,
        customer2Phone,
        12000.0,
        1200.0, // 10% discount
        1620.0, // tax on subtotal after discount
        12420.0,
        'accepted',
        'Quote for bulk hardware supply - Accepted',
        'Valid for 30 days from quote date. 5% early payment discount if paid within 10 days.',
        userId,
      ],
    );

    // Quotation 2 Items
    await pool.query(
      `INSERT INTO quotation_items (
         quotation_item_id, quotation_id, product_id, product_name,
         quantity, unit_price, discount_percentage, tax_rate, line_total
       ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9), ($10, $11, $12, $13, $14, $15, $16, $17, $18)`,
      [
        randomUUID(),
        quo2Id,
        product1.product_id,
        product1.product_name,
        50,
        100.0,
        10,
        15,
        5175.0,

        randomUUID(),
        quo2Id,
        product2.product_id,
        product2.product_name,
        40,
        170.0,
        10,
        15,
        7245.0,
      ],
    );

    // === QUOTATION 3: EXPIRED (validUntil in past) ===
    const quo3Id = randomUUID();
    const quo3Number = generateQuoNumber(currentYear, nextSeq + 2);
    const validUntil3 = new Date(today);
    validUntil3.setDate(validUntil3.getDate() - 5); // 5 days ago

    const createdDate3 = new Date(validUntil3);
    createdDate3.setDate(createdDate3.getDate() - 30);

    await pool.query(
      `INSERT INTO quotations (
         quotation_id, tenant_id, quotation_number, quotation_date, valid_until,
         customer_id, customer_name, customer_phone,
         subtotal, discount_amount, tax_amount, total_amount,
         status, notes, created_by, created_at, updated_at
       ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, now(), now())`,
      [
        quo3Id,
        tenantId,
        quo3Number,
        createdDate3,
        validUntil3,
        customerId1,
        customer1,
        customer1Phone,
        3000.0,
        0,
        450.0,
        3450.0,
        'expired',
        'Old quote - now expired',
        userId,
      ],
    );

    // Quotation 3 Items
    await pool.query(
      `INSERT INTO quotation_items (
         quotation_item_id, quotation_id, product_id, product_name,
         quantity, unit_price, discount_percentage, tax_rate, line_total
       ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [
        randomUUID(),
        quo3Id,
        product2.product_id,
        product2.product_name,
        10,
        300.0,
        null,
        15,
        3450.0,
      ],
    );

    // === QUOTATION 4: SENT (pending response) ===
    const quo4Id = randomUUID();
    const quo4Number = generateQuoNumber(currentYear, nextSeq + 3);
    const validUntil4 = new Date(today);
    validUntil4.setDate(validUntil4.getDate() + 14);

    await pool.query(
      `INSERT INTO quotations (
         quotation_id, tenant_id, quotation_number, quotation_date, valid_until,
         customer_id, customer_name, customer_phone,
         subtotal, discount_amount, tax_amount, total_amount,
         status, notes, terms_conditions, created_by, created_at, updated_at
       ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, now(), now())`,
      [
        quo4Id,
        tenantId,
        quo4Number,
        today,
        validUntil4,
        customerId2,
        'Walk-in Customer',
        '0701234567',
        8500.0,
        850.0,
        1107.5,
        8757.5,
        'sent',
        'Quote sent to customer via email',
        'Valid for 14 days. Please confirm acceptance.',
        userId,
      ],
    );

    // Quotation 4 Items
    await pool.query(
      `INSERT INTO quotation_items (
         quotation_item_id, quotation_id, product_id, product_name,
         quantity, unit_price, discount_percentage, tax_rate, line_total
       ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [
        randomUUID(),
        quo4Id,
        product1.product_id,
        product1.product_name,
        50,
        170.0,
        10,
        15,
        8757.5,
      ],
    );

    await pool.query('COMMIT');

    console.log(`✅ Seeded 4 quotations successfully!`);
    console.log(`   - QUO-${currentYear}-00001 (DRAFT)`);
    console.log(`   - QUO-${currentYear}-00002 (ACCEPTED)`);
    console.log(`   - QUO-${currentYear}-00003 (EXPIRED)`);
    console.log(`   - QUO-${currentYear}-00004 (SENT)`);
    console.log('\n📋 Test Quotations Created:');
    console.log(`   Customer 1: ${customer1} (${customerId1})`);
    console.log(`   Customer 2: ${customer2} (${customerId2})`);
  } catch (error) {
    await pool.query('ROLLBACK');
    console.error('❌ Error seeding quotations:', error.message);
    throw error;
  } finally {
    await pool.end();
  }
}

seedQuotationsData();
