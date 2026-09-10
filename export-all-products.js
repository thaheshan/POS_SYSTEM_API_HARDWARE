require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

let prisma;
let pool;
try {
  pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
  });
  const adapter = new PrismaPg(pool);
  prisma = new PrismaClient({ adapter });
} catch (e) {
  prisma = new PrismaClient();
}

async function exportAllProducts() {
  console.log('📦 Fetching all products from database for Trinco Hardware & Electricals (3924FC6C)...');

  const shops = await prisma.shop.findMany();
  let shop = shops.find(s => s.id.toLowerCase().includes('3924fc6c'));
  if (!shop && shops.length > 0) shop = shops[0];
  if (!shop) throw new Error('❌ No shop found in database!');
  console.log(`✅ Shop Found: ${shop.name} (${shop.id})`);

  const products = await prisma.product.findMany({
    where: { tenantId: shop.id },
    include: {
      category: true,
      subCategory: true,
      brand: true,
      stocks: true,
    },
    orderBy: { sku: 'asc' },
  });

  console.log(`✅ Total Products Found: ${products.length}`);

  // Save full JSON export
  const outputPath = path.join(__dirname, 'all_products_export.json');
  fs.writeFileSync(outputPath, JSON.stringify(products, null, 2));
  console.log(`📄 Exported full JSON data to: ${outputPath}`);

  // Create formatted Markdown catalog artifact
  let md = `# Complete Active Product Catalog — Trinco Hardware & Electricals (3924FC6C)\n\n`;
  md += `**Total SKUs / Active Catalog**: ${products.length} Items\n`;
  md += `**Export Date**: ${new Date().toLocaleString()}\n\n`;
  md += `| # | SKU | Barcode | Product Name | Category | Subcategory | Brand | Selling Price (Rs.) | Cost Price (Rs.) | Stock Qty | Unit |\n`;
  md += `| :---: | :--- | :--- | :--- | :--- | :--- | :--- | :---: | :---: | :---: | :---: |\n`;

  products.forEach((p, index) => {
    const cat = p.category?.name || '—';
    const sub = p.subCategory?.name || '—';
    const brand = p.brand?.name || 'Generic';
    const stockQty = p.stocks.reduce((acc, s) => acc + (s.quantity || 0), 0);
    const barcode = p.barcode || '—';
    const costPrice = p.purchasePrice != null ? p.purchasePrice : 0;
    const sellPrice = p.sellingPrice != null ? p.sellingPrice : 0;
    const unit = p.measurementUnit || 'pcs';

    md += `| ${index + 1} | \`${p.sku || '—'}\` | \`${barcode}\` | **${p.name.replace(/\|/g, '-')}** | ${cat} | ${sub} | ${brand} | ${sellPrice.toLocaleString()} | ${costPrice.toLocaleString()} | ${stockQty} | ${unit} |\n`;
  });

  const artifactDir = `C:\\Users\\Thahe\\.gemini\\antigravity\\brain\\ae3debcd-208f-4019-ad6c-df6d77fac4a5`;
  const mdPath = path.join(artifactDir, 'full_inventory_catalog.md');
  fs.writeFileSync(mdPath, md);
  console.log(`✨ Markdown catalog artifact written to: ${mdPath}`);
}

exportAllProducts()
  .catch(e => console.error('❌ Error exporting:', e))
  .finally(() => {
    prisma.$disconnect();
    if (pool) pool.end();
  });
