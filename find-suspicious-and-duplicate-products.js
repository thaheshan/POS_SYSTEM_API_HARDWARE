require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const { Pool } = require('pg');

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

// Simple Levenshtein distance for fuzzy string matching
function stringSimilarity(s1, s2) {
  const str1 = s1.toLowerCase().trim();
  const str2 = s2.toLowerCase().trim();
  if (str1 === str2) return 1.0;
  
  const longer = str1.length > str2.length ? str1 : str2;
  const shorter = str1.length > str2.length ? str2 : str1;
  if (longer.length === 0) return 1.0;
  
  let costs = [];
  for (let i = 0; i <= str1.length; i++) {
    let lastValue = i;
    for (let j = 0; j <= str2.length; j++) {
      if (i === 0) costs[j] = j;
      else if (j > 0) {
        let newValue = costs[j - 1];
        if (str1.charAt(i - 1) !== str2.charAt(j - 1)) {
          newValue = Math.min(Math.min(newValue, lastValue), costs[j]) + 1;
        }
        costs[j - 1] = lastValue;
        lastValue = newValue;
      }
    }
    if (i > 0) costs[str2.length] = lastValue;
  }
  return (longer.length - costs[str2.length]) / parseFloat(longer.length);
}

async function findSuspiciousAndDuplicates() {
  console.log('🔍 Scanning database for suspicious product names & duplicate candidates...\n');

  const shops = await prisma.shop.findMany();
  let shop = shops.find(s => s.id.toLowerCase().includes('3924fc6c'));
  if (!shop && shops.length > 0) shop = shops[0];
  if (!shop) throw new Error('❌ No shop found in database!');

  const products = await prisma.product.findMany({
    where: { tenantId: shop.id },
    select: { id: true, name: true, sku: true, barcode: true, sellingPrice: true },
    orderBy: { sku: 'asc' },
  });

  console.log(`📦 Total Products Analyzed: ${products.length}\n`);

  const exactDuplicates = new Map();
  const suspiciousShortNames = [];
  const zeroPriceProducts = [];
  const similarNamePairs = [];

  // 1. Check Exact Duplicates & Short/Suspicious Names
  products.forEach(p => {
    const key = p.name.toLowerCase().trim();
    if (exactDuplicates.has(key)) {
      exactDuplicates.get(key).push(p);
    } else {
      exactDuplicates.set(key, [p]);
    }

    if (p.name.trim().length <= 4) {
      suspiciousShortNames.push(p);
    }

    if (!p.sellingPrice || p.sellingPrice === 0) {
      zeroPriceProducts.push(p);
    }
  });

  // 2. Report Exact Duplicates
  let dupCount = 0;
  console.log('════════════════════════════════════════════════════════════');
  console.log('1. EXACT DUPLICATE PRODUCT NAMES');
  console.log('════════════════════════════════════════════════════════════');
  exactDuplicates.forEach((list, nameKey) => {
    if (list.length > 1) {
      dupCount++;
      console.log(`\n❌ DUPLICATE FOUND (${list.length} occurrences): "${list[0].name}"`);
      list.forEach(item => {
        console.log(`   └─ SKU: ${item.sku} | Price: Rs. ${item.sellingPrice}`);
      });
    }
  });
  if (dupCount === 0) {
    console.log('✅ ZERO exact duplicate product names found in database!');
  }

  // 3. Report Very Similar / Potentially Confusable Names (>85% Similarity)
  console.log('\n════════════════════════════════════════════════════════════');
  console.log('2. POTENTIALLY SIMILAR / CONFUSABLE PRODUCT NAMES (>85% Match)');
  console.log('════════════════════════════════════════════════════════════');
  let similarCount = 0;
  for (let i = 0; i < products.length; i++) {
    for (let j = i + 1; j < products.length; j++) {
      const p1 = products[i];
      const p2 = products[j];
      if (p1.name.toLowerCase() === p2.name.toLowerCase()) continue;

      const sim = stringSimilarity(p1.name, p2.name);
      if (sim >= 0.88) {
        similarCount++;
        if (similarCount <= 15) {
          console.log(`⚠️ Similar Pair:`);
          console.log(`   • (${p1.sku}) "${p1.name}"`);
          console.log(`   • (${p2.sku}) "${p2.name}"  [Match: ${Math.round(sim * 100)}%]`);
        }
      }
    }
  }
  if (similarCount === 0) {
    console.log('✅ No highly similar or confusing product name pairs found!');
  } else if (similarCount > 15) {
    console.log(`\n... and ${similarCount - 15} more similar name pairs.`);
  }

  // 4. Short / Vague Product Names
  console.log('\n════════════════════════════════════════════════════════════');
  console.log('3. SUSPICIOUSLY SHORT OR VAGUE PRODUCT NAMES (<= 4 Chars)');
  console.log('════════════════════════════════════════════════════════════');
  if (suspiciousShortNames.length > 0) {
    suspiciousShortNames.forEach(p => {
      console.log(`⚠️ SKU: ${p.sku} | Name: "${p.name}"`);
    });
  } else {
    console.log('✅ No suspiciously short or vague product names found!');
  }

  // 5. Zero Price Products
  console.log('\n════════════════════════════════════════════════════════════');
  console.log('4. PRODUCTS WITH RS. 0 SELLING PRICE');
  console.log('════════════════════════════════════════════════════════════');
  if (zeroPriceProducts.length > 0) {
    console.log(`⚠️ Found ${zeroPriceProducts.length} products with Rs. 0 price.`);
    zeroPriceProducts.slice(0, 10).forEach(p => {
      console.log(`   └─ SKU: ${p.sku} | Name: "${p.name}"`);
    });
  } else {
    console.log('✅ All active products have valid prices assigned!');
  }

  console.log('\n🎉 AUDIT COMPLETE!');
}

findSuspiciousAndDuplicates()
  .catch(e => console.error('❌ Error during audit:', e))
  .finally(() => {
    prisma.$disconnect();
    if (pool) pool.end();
  });
