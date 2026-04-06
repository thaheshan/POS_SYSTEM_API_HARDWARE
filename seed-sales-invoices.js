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

async function seedSalesInvoices() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Get existing tenant (ABC Hardware shop)
    const shopRes = await client.query(
      `SELECT shop_id FROM shops WHERE shop_name = 'ABC Hardware' LIMIT 1`,
    );

    if (shopRes.rows.length === 0) {
      throw new Error(
        'ABC Hardware shop not found. Run seed.js first to create the shop.',
      );
    }

    const tenantId = shopRes.rows[0].shop_id;

    // Get user ID (for cashierId)
    const userRes = await client.query(
      `SELECT user_id FROM users WHERE email = 'john@abchardware.lk' LIMIT 1`,
    );

    if (userRes.rows.length === 0) {
      throw new Error('User not found. Run seed.js first.');
    }

    const userId = userRes.rows[0].user_id;

    // Get accepted quotations
    const quotationsRes = await client.query(
      `SELECT q.quotation_id, q.tenant_id, q.quotation_number, 
              q.customer_id, q.customer_name, q.customer_phone,
              q.subtotal, q.discount_amount, q.tax_amount, q.total_amount
       FROM quotations q
       WHERE q.tenant_id = $1 AND q.status = 'accepted'
       ORDER BY q.created_at
       LIMIT 1`,
      [tenantId],
    );

    if (quotationsRes.rows.length === 0) {
      console.log('⚠️  No accepted quotations found. Skipping invoice seed.');
      await client.query('ROLLBACK');
      return;
    }

    const quotation = quotationsRes.rows[0];
    const quotationId = quotation.quotation_id;

    // Get quotation items
    const itemsRes = await client.query(
      `SELECT qi.quotation_item_id, qi.product_id, qi.variant_id, qi.product_name,
              qi.quantity, qi.unit_price, qi.discount_percentage, qi.tax_rate,
              qi.line_total,
              p.purchase_price
       FROM quotation_items qi
       LEFT JOIN products p ON qi.product_id = p.product_id
       WHERE qi.quotation_id = $1`,
      [quotationId],
    );

    if (itemsRes.rows.length === 0) {
      throw new Error('No items found for the selected quotation');
    }

    // Generate invoice number (INV-2026-00001)
    const currentYear = new Date().getFullYear();
    const countRes = await client.query(
      `SELECT COUNT(*) as count FROM sales_invoices 
       WHERE tenant_id = $1 
       AND DATE_PART('year', created_at) = $2`,
      [tenantId, currentYear],
    );

    const invoiceSequence = (countRes.rows[0].count || 0) + 1;
    const invoiceNumber = `INV-${currentYear}-${String(invoiceSequence).padStart(5, '0')}`;

    // Create sales invoice
    const invoiceId = randomUUID();
    const now = new Date();
    const invoiceDate = now.toISOString().split('T')[0];
    const invoiceTime = now.toTimeString().split(' ')[0]; // HH:MM:SS format

    const invoiceRes = await client.query(
      `INSERT INTO sales_invoices (
        invoice_id, tenant_id, invoice_number, invoice_date, invoice_time,
        customer_id, customer_name, customer_phone,
        sale_type, subtotal, discount_amount, tax_amount, total_amount,
        paid_amount, change_amount, balance,
        payment_status, status, cashier_id,
         updated_at
      ) VALUES (
        $1, $2, $3, $4, $5,
        $6, $7, $8,
        $9, $10, $11, $12, $13,
        $14, $15, $16,
        $17, $18, $19,
         NOW()
      ) RETURNING invoice_id`,
      [
        invoiceId,
        tenantId,
        invoiceNumber,
        invoiceDate,
        invoiceTime,
        quotation.customer_id,
        quotation.customer_name,
        quotation.customer_phone,
        'credit', // default sale type
        quotation.subtotal,
        quotation.discount_amount,
        quotation.tax_amount,
        quotation.total_amount,
        0, // paid_amount
        0, // change_amount
        quotation.total_amount, // balance = total
        'unpaid',
        'pending',
        userId,
      ],
    );

    const createdInvoiceId = invoiceRes.rows[0].invoice_id;

    // Create invoice items from quotation items
    let itemCount = 0;
    for (const item of itemsRes.rows) {
      // Calculate discount amount: quantity * unit_price * (discount_percentage / 100)
      const qty = parseFloat(item.quantity || 0);
      const unitPrice = parseFloat(item.unit_price || 0);
      const discountPct = parseFloat(item.discount_percentage || 0);
      const taxRate = parseFloat(item.tax_rate || 0);

      const discountAmt =
        qty > 0 && unitPrice > 0 ? qty * unitPrice * (discountPct / 100) : 0;

      // Calculate tax amount: (quantity * unit_price - discount_amount) * (tax_rate / 100)
      const subtotal = qty * unitPrice;
      const afterDiscount = subtotal - discountAmt;
      const taxAmt = afterDiscount > 0 ? afterDiscount * (taxRate / 100) : 0;

      await client.query(
        `INSERT INTO sales_invoice_items (
          item_id, invoice_id, product_id, variant_id, product_name,
          quantity, unit_price, discount_amount, discount_percentage,
          tax_rate, tax_amount, line_total, cost_price
        ) VALUES (
          $1, $2, $3, $4, $5,
          $6, $7, $8, $9,
          $10, $11, $12, $13
         
        )`,
        [
          randomUUID(),
          createdInvoiceId,
          item.product_id,
          item.variant_id,
          item.product_name,
          item.quantity,
          item.unit_price,
          discountAmt.toString(),
          item.discount_percentage,
          item.tax_rate,
          taxAmt.toString(),
          item.line_total,
          item.purchase_price || 0,
        ],
      );
      itemCount++;
    }

    await client.query('COMMIT');

    console.log(
      '✅ Sales Invoice seeded successfully!\n' +
        `   Invoice ID: ${createdInvoiceId}\n` +
        `   Invoice #: ${invoiceNumber}\n` +
        `   Customer: ${quotation.customer_name}\n` +
        `   Total: ${quotation.total_amount}\n` +
        `   Items: ${itemCount}\n`,
    );
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Error seeding sales invoices:', error.message || error);
    process.exit(1);
  } finally {
    client.release();
  }
}

seedSalesInvoices()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Fatal error:', error.message || error);
    process.exit(1);
  });
