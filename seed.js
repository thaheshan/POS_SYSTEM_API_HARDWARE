import dotenv from 'dotenv';
import pg from 'pg';
import bcrypt from 'bcrypt';
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

const shopName = 'ABC Hardware';
const userEmail = 'cashier@test.com'; //Change as needed

try {
  await pool.query('BEGIN');

  const existingShop = await pool.query(
    `SELECT shop_id FROM shops WHERE shop_name = $1 LIMIT 1`,
    [shopName],
  );
  let tenantId = existingShop.rows[0]?.shop_id;

  if (!tenantId) {
    const insertedShop = await pool.query(
      `INSERT INTO shops (shop_id, shop_name, is_active, updated_at)
       VALUES ($1, $2, true, now())
       RETURNING shop_id`,
      [randomUUID(), shopName],
    );
    tenantId = insertedShop.rows[0]?.shop_id;
  }

  if (!tenantId) {
    throw new Error('Could not resolve tenant/shop ID for user seeding.');
  }

  const hash = await bcrypt.hash('Cashier@123', 10); // Change password as needed

  // Change the role and other user details as needed. This creates/updates a cashier user.
  await pool.query(
    `INSERT INTO users (user_id, tenant_id, email, password_hash, first_name, last_name, role, is_active, is_verified, updated_at)
     VALUES ($1, $2, $3, $4, 'Kamal', 'Sharma', 'cashier', true, true, now())
     ON CONFLICT (email)
     DO UPDATE SET
       tenant_id = EXCLUDED.tenant_id,
       password_hash = EXCLUDED.password_hash,
       first_name = EXCLUDED.first_name,
       last_name = EXCLUDED.last_name,
       role = EXCLUDED.role,
       is_active = EXCLUDED.is_active,
       is_verified = EXCLUDED.is_verified,
       updated_at = now()`,
    [randomUUID(), tenantId, userEmail, hash],
  );

  await pool.query('COMMIT');

  console.log(`Seed completed. tenant_id=${tenantId}, email=${userEmail}`);
} catch (error) {
  await pool.query('ROLLBACK').catch(() => undefined);
  if (error && typeof error === 'object' && 'code' in error) {
    if (error.code === 'ETIMEDOUT') {
      console.error(
        `DB timeout to ${dbHost ?? 'DATABASE_URL host'}:${dbPort}. Check network/VPN/firewall and confirm Supabase pooler host/port.`,
      );
    }
  }

  if (
    error &&
    typeof error === 'object' &&
    'errors' in error &&
    Array.isArray(error.errors)
  ) {
    for (const nested of error.errors) {
      if (nested && typeof nested === 'object' && 'code' in nested) {
        if (nested.code === 'ETIMEDOUT' || nested.code === 'ENETUNREACH') {
          console.error(
            `Network issue (${nested.code}) while connecting to database. Verify host, port, and internet routing.`,
          );
          break;
        }
      }
    }
  }

  throw error;
} finally {
  await pool.end();
}
