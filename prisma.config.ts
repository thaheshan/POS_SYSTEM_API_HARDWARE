import path from 'node:path';
import dotenv from 'dotenv';
dotenv.config();
import { defineConfig } from 'prisma/config';

function resolveDatabaseUrl(): string {
  if (process.env.DATABASE_URL) {
    return process.env.DATABASE_URL;
  }

  const password = process.env.DB_PASSWORD;
  if (!password) {
    throw new Error('DATABASE_URL or DB_PASSWORD must be set for Prisma CLI');
  }

  // Fallback for local development based on the existing Supabase pool config.
  return `postgresql://postgres.wftdcqgueuelimbakhhx:${encodeURIComponent(password)}@aws-1-ap-southeast-1.pooler.supabase.com:5432/postgres?sslmode=require`;
}

export default defineConfig({
  schema: path.join(process.cwd(), 'prisma', 'schema.prisma'),
  datasource: {
    url: resolveDatabaseUrl(),
  },
});
