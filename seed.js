import dotenv from 'dotenv';
import pg from 'pg';
import bcrypt from 'bcrypt';
import crypto from 'crypto';

dotenv.config();
const { Pool } = pg;

const pool = new Pool({
  host: 'aws-1-ap-southeast-1.pooler.supabase.com',
  port: 5432,
  database: 'postgres',
  user: 'postgres.wftdcqgueuelimbakhhx',
  password: process.env.DB_PASSWORD,
  ssl: { rejectUnauthorized: false },
});

const email = process.env.SEED_USER_EMAIL || 'john@abchardware.lk';
let password = process.env.SEED_USER_PASSWORD;
if (!password) {
  password = crypto.randomBytes(12).toString('hex') + 'A1!';
  console.log(`[SEED] SEED_USER_PASSWORD not set. Generated random password: ${password}`);
}

const hash = await bcrypt.hash(password, 10);
await pool.query(
  `INSERT INTO users (user_id, tenant_id, email, password_hash, first_name, last_name, role, is_active, is_verified, updated_at)
   VALUES (gen_random_uuid(), gen_random_uuid(), $2, $1, 'John', 'Silva', 'owner', true, true, now())`,
  [hash, email],
);
console.log(`User created for ${email}!`);
await pool.end();
