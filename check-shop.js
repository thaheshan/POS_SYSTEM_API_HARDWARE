const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const shops = await prisma.shop.findMany();
  console.log('SHOPS:', JSON.stringify(shops, null, 2));

  const targetShop = shops.find(s => s.id.toLowerCase().includes('3924fc6c') || s.name.toLowerCase().includes('3924fc6c'));
  console.log('TARGET SHOP:', targetShop);

  const categories = await prisma.category.findMany();
  console.log('CATEGORIES:', categories.map(c => ({ id: c.id, name: c.name, parentId: c.parentId })));

  const warehouses = await prisma.warehouse.findMany();
  console.log('WAREHOUSES:', warehouses.map(w => ({ id: w.id, name: w.name, tenantId: w.tenantId })));
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
