import path from 'node:path';
import dotenv from 'dotenv';
dotenv.config();
import { defineConfig } from 'prisma/config';

const directUrl = process.env.DIRECT_URL;
const databaseUrl = process.env.DATABASE_URL;
const nodeEnv = process.env.NODE_ENV || 'development';

// Warn if DIRECT_URL missing (but allow fallback in dev)
if (!directUrl && nodeEnv === 'production') {
  throw new Error(
    'DIRECT_URL is required in production.\n' +
      'This should be a direct connection to the database (bypassing connection pooler).\n' +
      'See .env.example for details.',
  );
}

if (!directUrl && nodeEnv !== 'production') {
  console.warn(
    '⚠️  DIRECT_URL not set. Using DATABASE_URL as fallback.\n' +
      '   This works for development but may cause migration failures in staging/production.\n' +
      '   Please set both DIRECT_URL and DATABASE_URL for consistency.',
  );
}

if (!databaseUrl) {
  throw new Error('DATABASE_URL is required.');
}

export default defineConfig({
  schema: path.join(process.cwd(), 'prisma', 'schema.prisma'),
  datasource: {
    // Connection strategy:
    // - DIRECT_URL: Direct DB connection for migrations/DDL (no pooling)
    // - DATABASE_URL: Pooled connection for app queries (via PgBouncer)
    //
    // Why both?
    // Connection poolers (e.g., PgBouncer, Supabase) don't support all DDL operations.
    // Prisma needs direct access for `prisma migrate` and schema changes.
    //
    // If DIRECT_URL is missing:
    // - Dev/local: Fallback to DATABASE_URL (works if not using pooler)
    // - Production: Migrations will fail silently - ALWAYS SET BOTH
    //
    //
    url: directUrl ?? databaseUrl,
  },
});
