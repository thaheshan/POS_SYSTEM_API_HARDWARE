import {
  Injectable,
  OnModuleInit,
  OnModuleDestroy,
  Logger,
} from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

export type PrismaClientType = PrismaClient;

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(PrismaService.name);
  private readonly client: PrismaClient;

  constructor() {
    const databaseUrl = process.env.DATABASE_URL;
    const host = process.env.SUPABASE_DB_HOST;
    const port = Number(process.env.SUPABASE_DB_PORT ?? 6543);
    const database = process.env.SUPABASE_DB_NAME ?? 'postgres';
    const user = process.env.SUPABASE_DB_USER;
    const password = process.env.SUPABASE_DB_PASSWORD;

    if (!databaseUrl && (!host || !user || !password)) {
      throw new Error(
        'Missing database config. Provide DATABASE_URL or SUPABASE_DB_HOST, SUPABASE_DB_USER, SUPABASE_DB_PASSWORD.',
      );
    }

    const pool = new Pool({
      ...(host && user && password
        ? {
            host,
            port,
            database,
            user,
            password,
          }
        : { connectionString: databaseUrl }),
      ssl: { rejectUnauthorized: false },
      connectionTimeoutMillis: 15000,
      idleTimeoutMillis: 30000,
      keepAlive: true,
      keepAliveInitialDelayMillis: 10000,
      max: 10,
    });

    const adapter = new PrismaPg(pool);
    super({ adapter });
    this.client = this as unknown as PrismaClient;
  }

  get db(): PrismaClient {
    return this.client;
  }

  async onModuleInit() {
    await this.$connect();
    this.logger.log('Supabase PostgreSQL Connected Successfully');
  }

  async onModuleDestroy() {
    await this.$disconnect();
    this.logger.log('Supabase PostgreSQL Disconnected');
  }
}
