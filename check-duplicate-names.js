const fs = require('fs');
const path = require('path');

const batchFiles = [];
for (let i = 2; i <= 17; i++) {
  const filePath = path.join(__dirname, `insert-products-batch${i}.js`);
  if (fs.existsSync(filePath)) {
    batchFiles.push({ num: i, path: filePath });
  }
}

const productMap = new Map();
const duplicates = [];

batchFiles.forEach(({ num, path: filePath }) => {
  const content = fs.readFileSync(filePath, 'utf8');
  // extract names using regex
  const matches = content.matchAll(/name:\s*['"]([^'"]+)['"]/g);
  for (const m of matches) {
    const name = m[1].trim();
    const key = name.toLowerCase();
    if (productMap.has(key)) {
      duplicates.push({
        name,
        firstSeen: productMap.get(key),
        duplicateIn: `Batch ${num}`,
      });
    } else {
      productMap.set(key, `Batch ${num}`);
    }
  }
});

console.log(`\n🔍 CHECKING PRODUCT NAME DUPLICATES ACROSS ALL BATCHES (Batches 2-17)...`);
console.log(`📦 Total Unique Names Scanned: ${productMap.size}`);
console.log(`⚠️ Total Duplicates Found: ${duplicates.length}\n`);

if (duplicates.length > 0) {
  console.log(`--- DUPLICATE DETAILS ---`);
  duplicates.forEach((d, i) => {
    console.log(`${i + 1}. "${d.name}" (First in ${d.firstSeen}, Repeated in ${d.duplicateIn})`);
  });
} else {
  console.log(`✅ EXCELLENT! Zero duplicate product names found across all batch insertion scripts!`);
}
