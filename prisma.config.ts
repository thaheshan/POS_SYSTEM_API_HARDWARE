import path from 'node:path';
import dotenv from 'dotenv';
dotenv.config();
import { defineConfig } from 'prisma/config';

export default defineConfig({
  schema: path.join(process.cwd(), 'prisma', 'schema.prisma'),
  datasource: {
    url: process.env.DATABASE_URL as string,
  },
});