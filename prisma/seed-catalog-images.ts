import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import axios from 'axios';
import * as dotenv from 'dotenv';
dotenv.config();

const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

async function fetchWikipediaImage(productName: string): Promise<string | null> {
  try {
    const q = encodeURIComponent(`${productName} hardware tool`);
    const headers = { 'User-Agent': 'HardwarePOSBot/1.0 (https://example.com; admin@example.com)' };
    
    const { data } = await axios.get(
      `https://en.wikipedia.org/w/api.php?action=query&format=json&prop=pageimages&generator=search&gsrsearch=${q}&gsrnamespace=0&gsrlimit=3&pithumbsize=500`,
      { timeout: 5000, headers }
    );
    const pages = data?.query?.pages;
    if (pages) {
      for (const pageId in pages) {
        const source = pages[pageId]?.thumbnail?.source;
        if (source && !source.toLowerCase().endsWith('.svg')) return source;
      }
    }
    
    // Fallback simple search
    const simpleQ = encodeURIComponent(productName.replace(/\(.*\)/g, '').trim()); // Remove brackets like "(per kg)"
    const fallback = await axios.get(
      `https://en.wikipedia.org/w/api.php?action=query&format=json&prop=pageimages&generator=search&gsrsearch=${simpleQ}&gsrnamespace=0&gsrlimit=2&pithumbsize=500`,
      { timeout: 4000, headers }
    );
    const fbPages = fallback.data?.query?.pages;
    if (fbPages) {
      for (const pageId in fbPages) {
        const source = fbPages[pageId]?.thumbnail?.source;
        if (source && !source.toLowerCase().endsWith('.svg')) return source;
      }
    }
  } catch (err: any) {
    // console.error(`Failed to fetch for ${productName}:`, err.message);
  }
  return null;
}

async function main() {
  console.log('🖼️  Fetching web images for master catalog products...');
  
  const adminShop = await prisma.shop.findFirst({ where: { name: 'SYSTEM_ADMIN_SHOP' } });
  if (!adminShop) return console.error('❌ SYSTEM_ADMIN_SHOP not found.');

  const products = await prisma.product.findMany({
    where: { tenantId: adminShop.id },
    include: { images: true },
  });

  const productsWithoutImage = products.filter(p => p.images.length === 0);
  console.log(`Found ${productsWithoutImage.length} products without images out of ${products.length}.`);

  let fetched = 0;
  for (let i = 0; i < productsWithoutImage.length; i++) {
    const p = productsWithoutImage[i];
    process.stdout.write(`\r  > Fetching [${i + 1}/${productsWithoutImage.length}] ${p.name.substring(0, 30)}...   `);
    
    const imgUrl = await fetchWikipediaImage(p.name);
    if (imgUrl) {
      await prisma.productImage.create({
        data: {
          productId: p.id,
          imageUrl: imgUrl,
          isPrimary: true,
        }
      });
      fetched++;
    }
    
    // Slight delay to respect Wikipedia API limits
    await sleep(200); 
  }

  console.log(`\n\n✅ Done! Fetched ${fetched} new images from the web for the catalog.`);
}

main()
  .catch(e => console.error(e))
  .finally(async () => { await prisma.$disconnect(); await pool.end(); });
