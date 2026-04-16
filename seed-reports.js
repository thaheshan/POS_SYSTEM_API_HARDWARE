import dotenv from 'dotenv';
import pg from 'pg';
import { randomUUID, createHash } from 'crypto';

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

async function seedReports() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Get shop
    const shopRes = await client.query(
      `SELECT shop_id FROM shops WHERE shop_name = 'ABC Hardware' LIMIT 1`,
    );

    if (shopRes.rows.length === 0) {
      console.log('⚠️  Shop not found. Run seed.js first.');
      await client.query('ROLLBACK');
      process.exit(1);
    }

    const tenantId = shopRes.rows[0].shop_id;
    console.log(`✓ Found shop: ${tenantId}`);

    // Get or create branch
    const branchRes = await client.query(
      `SELECT branch_id FROM branches WHERE tenant_id = $1 LIMIT 1`,
      [tenantId],
    );

    let branchId;
    if (branchRes.rows.length === 0) {
      branchId = randomUUID();
      await client.query(
        `INSERT INTO branches (branch_id, tenant_id, branch_name, is_active, created_at, updated_at)
         VALUES ($1, $2, $3, true, now(), now())`,
        [branchId, tenantId, 'Main Branch'],
      );
      console.log(`✓ Created branch: ${branchId}`);
    } else {
      branchId = branchRes.rows[0].branch_id;
      console.log(`✓ Found branch: ${branchId}`);
    }

    // Get products
    const productsRes = await client.query(
      `SELECT product_id, product_name, selling_price, purchase_price 
       FROM products WHERE tenant_id = $1 LIMIT 5`,
      [tenantId],
    );

    if (productsRes.rows.length === 0) {
      console.log('⚠️  No products found. Run product seed first.');
      await client.query('ROLLBACK');
      process.exit(1);
    }

    const products = productsRes.rows;
    console.log(`✓ Found ${products.length} products`);

    // Get categories
    const catRes = await client.query(
      `SELECT DISTINCT category_id, category_name FROM categories 
       WHERE tenant_id = $1 LIMIT 5`,
      [tenantId],
    );

    const categories =
      catRes.rows.length > 0
        ? catRes.rows
        : [{ category_id: randomUUID(), category_name: 'General' }];
    console.log(`✓ Found ${categories.length} categories`);

    // Get or create cashier
    const userRes = await client.query(
      `SELECT user_id FROM users 
       WHERE email = 'cashier@test.lk' AND tenant_id = $1 LIMIT 1`,
      [tenantId],
    );

    let cashierId;
    if (userRes.rows.length === 0) {
      cashierId = randomUUID();
      const passwordHash = createHash('sha256')
        .update('password123')
        .digest('hex');
      await client.query(
        `INSERT INTO users (user_id, tenant_id, email, password_hash, first_name, last_name, role, is_active, is_verified, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, true, true, now(), now())
         ON CONFLICT DO NOTHING`,
        [
          cashierId,
          tenantId,
          'cashier@test.lk',
          passwordHash,
          'Test',
          'Cashier',
          'cashier',
        ],
      );
      console.log(`✓ Created cashier: ${cashierId}`);
    } else {
      cashierId = userRes.rows[0].user_id;
      console.log(`✓ Found cashier: ${cashierId}`);
    }

    // Check if report already exists for today
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const reportDateStr = today.toISOString().split('T')[0];

    const existingReport = await client.query(
      `SELECT report_id FROM reports_generated 
       WHERE tenant_id = $1 AND branch_id = $2 AND report_date = $3`,
      [tenantId, branchId, reportDateStr],
    );

    if (existingReport.rows.length > 0) {
      console.log(
        `⚠️  Report already exists for ${reportDateStr}. Skipping creation.`,
      );
    } else {
      // Create sample sales invoices
      const invoiceIds = [];
      for (let i = 0; i < 5; i++) {
        const invoiceId = randomUUID();
        const product = products[i % products.length];
        const qty = Math.floor(Math.random() * 5) + 1;
        const unitPrice = parseFloat(product.selling_price || 100);
        const costPrice = parseFloat(product.purchase_price || 50);
        const subtotal = unitPrice * qty;
        const taxAmount = subtotal * 0.1;
        const totalAmount = subtotal + taxAmount;
        const saleType = ['cash', 'card', 'credit'][
          Math.floor(Math.random() * 3)
        ];
        const invoiceNum = `INV-${Date.now()}-${i}`;
        const invoiceTime = new Date(
          today.getTime() + Math.random() * 24 * 60 * 60 * 1000,
        );

        await client.query(
          `INSERT INTO sales_invoices 
           (invoice_id, tenant_id, branch_id, invoice_number, invoice_date, invoice_time, cashier_id, status, sale_type, subtotal, tax_amount, discount_amount, total_amount, paid_amount, balance, payment_status, created_at, updated_at) 
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, now(), now())`,
          [
            invoiceId,
            tenantId,
            branchId,
            invoiceNum,
            reportDateStr,
            invoiceTime.toISOString().split('T')[1],
            cashierId,
            'completed',
            saleType,
            subtotal.toString(),
            taxAmount.toString(),
            '0',
            totalAmount.toString(),
            totalAmount.toString(),
            '0',
            'paid',
          ],
        );

        // Create invoice items
        await client.query(
          `INSERT INTO sales_invoice_items 
           (item_id, invoice_id, product_id, product_name, quantity, unit_price, discount_amount, line_total, cost_price) 
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
          [
            randomUUID(),
            invoiceId,
            product.product_id,
            product.product_name,
            qty.toString(),
            unitPrice.toString(),
            '0',
            subtotal.toString(),
            costPrice.toString(),
          ],
        );

        invoiceIds.push(invoiceId);
      }
      console.log(`✓ Created 5 sample sales invoices`);
    }

    // Calculate report metrics
    const invoicesQuery = await client.query(
      `SELECT 
        COUNT(*) as total_transactions,
        SUM(CAST(total_amount AS DECIMAL(12,2))) as total_revenue,
        MAX(CAST(total_amount AS DECIMAL(12,2))) as largest_transaction,
        MIN(CAST(total_amount AS DECIMAL(12,2))) as smallest_transaction,
        SUM(CAST(tax_amount AS DECIMAL(12,2))) as vat_collected
       FROM sales_invoices 
       WHERE tenant_id = $1 AND branch_id = $2 AND invoice_date = $3`,
      [tenantId, branchId, reportDateStr],
    );

    const metrics = invoicesQuery.rows[0] || {};
    const totalTransactions = parseInt(metrics.total_transactions || 0);
    const totalRevenue = parseFloat(metrics.total_revenue || 0);
    const largestTransaction = parseFloat(metrics.largest_transaction || 0);
    const smallestTransaction = parseFloat(metrics.smallest_transaction || 0);
    const vatCollected = parseFloat(metrics.vat_collected || 0);
    const averageBill =
      totalTransactions > 0 ? totalRevenue / totalTransactions : 0;

    // Category rankings
    const categoryQuery = await client.query(
      `SELECT 
        COALESCE(c.category_id, $3) as category_id,
        COALESCE(c.category_name, 'General') as category_name,
        SUM(CAST(sii.line_total AS DECIMAL(12,2))) as category_revenue
       FROM sales_invoice_items sii
       LEFT JOIN products p ON sii.product_id = p.product_id
       LEFT JOIN categories c ON p.category_id = c.category_id
       JOIN sales_invoices si ON sii.invoice_id = si.invoice_id
       WHERE si.tenant_id = $1 AND si.branch_id = $2 AND si.invoice_date = $4
       GROUP BY c.category_id, c.category_name
       ORDER BY category_revenue DESC`,
      [tenantId, branchId, randomUUID(), reportDateStr],
    );

    const categoryRankings = (categoryQuery.rows || []).map((row, idx) => ({
      category_id: row.category_id,
      name: row.category_name,
      revenue: parseFloat(row.category_revenue || 0),
      revenue_pct:
        totalRevenue > 0
          ? (
              (parseFloat(row.category_revenue || 0) / totalRevenue) *
              100
            ).toFixed(2)
          : '0',
      profit_margin: 25.0,
      vs_yesterday_pct: 0,
      top_product: 'Sample Product',
    }));

    // Staff performance
    const staffQuery = await client.query(
      `SELECT 
        si.cashier_id,
        COALESCE(u.first_name || ' ' || u.last_name, 'Unknown') as full_name,
        COUNT(*) as transactions,
        SUM(CAST(si.total_amount AS DECIMAL(12,2))) as revenue
       FROM sales_invoices si
       LEFT JOIN users u ON si.cashier_id = u.user_id
       WHERE si.tenant_id = $1 AND si.branch_id = $2 AND si.invoice_date = $3
       GROUP BY si.cashier_id, u.first_name, u.last_name
       ORDER BY revenue DESC`,
      [tenantId, branchId, reportDateStr],
    );

    const staffPerformance = (staffQuery.rows || []).map((row) => ({
      cashier_id: row.cashier_id,
      name: row.full_name,
      transactions: parseInt(row.transactions || 0),
      revenue: parseFloat(row.revenue || 0),
    }));

    // Calculate COGS
    const cogsQuery = await client.query(
      `SELECT SUM(CAST(CAST(cost_price AS DECIMAL(12,2)) * CAST(quantity AS DECIMAL(12,2)) AS DECIMAL(12,2))) as cogs
       FROM sales_invoice_items sii
       JOIN sales_invoices si ON sii.invoice_id = si.invoice_id
       WHERE si.tenant_id = $1 AND si.branch_id = $2 AND si.invoice_date = $3`,
      [tenantId, branchId, reportDateStr],
    );

    const cogs = parseFloat(cogsQuery.rows[0]?.cogs || 0);
    const grossProfit = totalRevenue - cogs;
    const operatingExpenses = 150.0;
    const netProfit = grossProfit - operatingExpenses;

    // Payment breakdown
    const paymentQuery = await client.query(
      `SELECT 
        sale_type,
        SUM(CAST(total_amount AS DECIMAL(12,2))) as amount
       FROM sales_invoices
       WHERE tenant_id = $1 AND branch_id = $2 AND invoice_date = $3
       GROUP BY sale_type`,
      [tenantId, branchId, reportDateStr],
    );

    const paymentByType = {};
    let totalPayment = 0;
    (paymentQuery.rows || []).forEach((row) => {
      paymentByType[row.sale_type] = parseFloat(row.amount || 0);
      totalPayment += parseFloat(row.amount || 0);
    });

    const paymentBreakdown = {
      cash: paymentByType['cash'] || 0,
      card: paymentByType['card'] || 0,
      credit: paymentByType['credit'] || 0,
      percentages: {
        cash:
          totalPayment > 0
            ? (((paymentByType['cash'] || 0) / totalPayment) * 100).toFixed(2)
            : 0,
        card:
          totalPayment > 0
            ? (((paymentByType['card'] || 0) / totalPayment) * 100).toFixed(2)
            : 0,
        credit:
          totalPayment > 0
            ? (((paymentByType['credit'] || 0) / totalPayment) * 100).toFixed(2)
            : 0,
      },
    };

    // Inventory alerts
    const lowStockRes = await client.query(
      `SELECT s.product_id, p.product_name, s.quantity 
       FROM stock s
       JOIN products p ON s.product_id = p.product_id
       WHERE s.branch_id = $1 AND s.quantity <= 10 
       LIMIT 3`,
      [branchId],
    );

    const lowStockItems = (lowStockRes.rows || []).map((row) => ({
      product_id: row.product_id,
      name: row.product_name,
      quantity: parseInt(row.quantity || 0),
    }));

    const outOfStockItems = [];

    // Upsert report
    const reportId = randomUUID();
    await client.query(
      `INSERT INTO reports_generated 
       (report_id, tenant_id, branch_id, report_date, 
        total_revenue, total_transactions, average_bill, 
        largest_transaction, smallest_transaction,
        cash_amount, card_amount, credit_amount, payment_percentages,
        cogs, gross_profit, operating_expenses, net_profit,
        vat_collected, vat_paid, net_vat,
        category_rankings, staff_performance, low_stock_items, out_of_stock_items,
        created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, now(), now())
       ON CONFLICT (tenant_id, branch_id, report_date) 
       DO UPDATE SET
        total_revenue = $5,
        total_transactions = $6,
        average_bill = $7,
        largest_transaction = $8,
        smallest_transaction = $9,
        cash_amount = $10,
        card_amount = $11,
        credit_amount = $12,
        payment_percentages = $13,
        cogs = $14,
        gross_profit = $15,
        operating_expenses = $16,
        net_profit = $17,
        vat_collected = $18,
        vat_paid = $19,
        net_vat = $20,
        category_rankings = $21,
        staff_performance = $22,
        low_stock_items = $23,
        out_of_stock_items = $24,
        updated_at = now()`,
      [
        reportId,
        tenantId,
        branchId,
        reportDateStr,
        totalRevenue.toString(),
        totalTransactions,
        averageBill.toString(),
        largestTransaction.toString(),
        smallestTransaction.toString(),
        (paymentByType['cash'] || 0).toString(),
        (paymentByType['card'] || 0).toString(),
        (paymentByType['credit'] || 0).toString(),
        JSON.stringify(paymentBreakdown.percentages),
        cogs.toString(),
        grossProfit.toString(),
        operatingExpenses.toString(),
        netProfit.toString(),
        vatCollected.toString(),
        '0',
        vatCollected.toString(),
        JSON.stringify(categoryRankings),
        JSON.stringify(staffPerformance),
        JSON.stringify(lowStockItems),
        JSON.stringify(outOfStockItems),
      ],
    );

    await client.query('COMMIT');

    console.log(`\n✅ End-of-Day Report seeded successfully!`);
    console.log(`\n📊 Report Summary:`);
    console.log(`   Date: ${reportDateStr}`);
    console.log(`   Total Revenue: ${totalRevenue.toFixed(2)}`);
    console.log(`   Transactions: ${totalTransactions}`);
    console.log(`   Average Bill: ${averageBill.toFixed(2)}`);
    console.log(`   COGS: ${cogs.toFixed(2)}`);
    console.log(`   Gross Profit: ${grossProfit.toFixed(2)}`);
    console.log(`   Net Profit: ${netProfit.toFixed(2)}`);
    console.log(`   VAT Collected: ${vatCollected.toFixed(2)}`);
    console.log(`   Categories: ${categoryRankings.length}`);
    console.log(`   Staff: ${staffPerformance.length}`);
    console.log(`   Low Stock Items: ${lowStockItems.length}`);
  } catch (error) {
    await client.query('ROLLBACK').catch(() => undefined);
    console.error('❌ Error seeding reports:', error.message || error);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

seedReports()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('Fatal error:', err.message || err);
    process.exit(1);
  });
