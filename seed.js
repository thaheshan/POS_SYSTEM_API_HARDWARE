import dotenv from 'dotenv';
import pg from 'pg';
import bcrypt from 'bcrypt';

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

const hash = await bcrypt.hash('SecurePass@2026', 10);
await pool.query(
  `INSERT INTO users (user_id, tenant_id, email, password_hash, first_name, last_name, role, is_active, is_verified, updated_at)
   VALUES (gen_random_uuid(), gen_random_uuid(), 'john@abchardware.lk', $1, 'John', 'Silva', 'owner', true, true, now())`,
  [hash],
);
console.log('User created!');
await pool.end();
