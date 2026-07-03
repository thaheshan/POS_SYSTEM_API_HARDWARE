import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function check() {
  try {
    const count = await prisma.$queryRaw`SELECT count(*) FROM activity_logs`;
    console.log("TABLE EXISTS! Count:", count);
    
    const logs = await prisma.activityLog.findMany();
    console.log("LOGS:", logs);
  } catch (err) {
    console.error("ERROR:", err);
  } finally {
    await prisma.$disconnect();
  }
}

check();
