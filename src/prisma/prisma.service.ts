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
    const pool = new Pool({
      host: 'aws-1-ap-southeast-1.pooler.supabase.com',
      port: 5432,
      database: 'postgres',
      user: 'postgres.wftdcqgueuelimbakhhx',
      password: process.env.DB_PASSWORD,
      ssl: { rejectUnauthorized: false },
      keepAlive: true,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 10000,
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