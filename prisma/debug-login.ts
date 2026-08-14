import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import * as bcrypt from 'bcrypt';
import * as dotenv from 'dotenv';
dotenv.config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  const email = process.env.SEED_ADMIN_EMAIL || 'admin@futurasolutions.com';
  const password = process.env.SEED_ADMIN_PASSWORD || 'Futura@Admin123';

  console.log('--- Debug Login Test ---');

  // 1. Check user exists
  const user = await prisma.user.findUnique({
    where: { email },
    include: { role: true },
  });

  if (!user) {
    console.log('❌ User NOT found in database for email:', email);
    return;
  }
  console.log('✅ User found:', user.user_id);
  console.log('   is_active  :', user.is_active);
  console.log('   is_verified:', user.is_verified);
  console.log('   status     :', user.status);
  console.log('   role       :', user.role?.name);
  console.log('   hash stored:', user.password_hash?.substring(0, 30) + '...');

  // 2. Test password comparison
  const isMatch = await bcrypt.compare(password, user.password_hash);
  console.log('\n🔑 Password match result:', isMatch ? '✅ MATCH' : '❌ NO MATCH');

  if (!isMatch) {
    // Re-generate the hash NOW and update it to fix
    console.log('\n🔧 Re-generating and updating password hash...');
    const newHash = await bcrypt.hash(password, 10);
    await prisma.user.update({
      where: { email },
      data: { password_hash: newHash },
    });
    console.log('✅ Password hash updated. Try logging in again.');
  } else {
    console.log('\n✅ Password is correct. Login should work.');
    console.log('   Possible issue: is_active, is_verified, or status.');
    
    // Fix any potential flag issues
    await prisma.user.update({
      where: { email },
      data: {
        is_active: true,
        is_verified: true,
        status: 'APPROVED',
        failed_login_attempts: 0,
        account_locked_until: null,
      },
    });
    console.log('✅ All flags reset to correct values.');
  }
}

main()
  .catch((e) => {
    console.error('Error:', e.message);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
