import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import jwt from 'jsonwebtoken';
import * as dotenv from 'dotenv';
dotenv.config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  const email = process.argv[2] || 'admin@futurasolutions.com';
  console.log(`Generating developer token for user: ${email}...`);

  const user = await prisma.user.findUnique({
    where: { email },
    include: { role: true },
  });

  if (!user) {
    console.error(`❌ User with email ${email} not found.`);
    process.exit(1);
  }

  const secret = process.env.JWT_SECRET;
  if (!secret) {
    console.error('❌ JWT_SECRET is not defined in .env.');
    process.exit(1);
  }

  const payload = {
    sub: user.user_id,
    email: user.email,
    role: user.role?.name || 'UNKNOWN',
    tenant_id: user.tenant_id,
  };

  const devToken = jwt.sign(payload, secret, { expiresIn: '365d' });

  console.log('\n✅ Developer Token Generated (Valid for 365 days):');
  console.log('--------------------------------------------------');
  console.log(devToken);
  console.log('--------------------------------------------------\n');
  console.log('Use this token in your curl or Postman headers as:');
  console.log(`Authorization: Bearer ${devToken}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
