import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import axios from 'axios';

@Injectable()
export class CatalogService {
  constructor(private readonly prisma: PrismaService) {}

  // ─── Fetch a relevant image URL from Wikimedia Commons ────────────────────
  async fetchProductImage(productName: string, category?: string): Promise<string | null> {
    try {
      // Build a search query. We want realistic photos.
      // We append keywords to avoid schematic/diagram images if possible
      const q = encodeURIComponent(`${productName} hardware tool`);
      const headers = { 'User-Agent': 'HardwarePOSBot/1.0 (https://example.com; admin@example.com)' };
      
      const { data } = await axios.get(
        `https://en.wikipedia.org/w/api.php?action=query&format=json&prop=pageimages&generator=search&gsrsearch=${q}&gsrnamespace=0&gsrlimit=5&pithumbsize=500`,
        { timeout: 5000, headers },
      );

      const pages = data?.query?.pages;
      if (!pages) throw new Error('No results');

      // Find the first page with a thumbnail image
      for (const pageId in pages) {
        const page = pages[pageId];
        if (page.thumbnail && page.thumbnail.source) {
          // Exclude svg/icons if possible
          if (!page.thumbnail.source.toLowerCase().endsWith('.svg')) {
            return page.thumbnail.source;
          }
        }
      }

      return null;
    } catch (err: any) {
      // Fallback: try simpler search term
      try {
        const simpleQ = encodeURIComponent(productName.replace(/\(.*\)/g, '').trim());
        const { data } = await axios.get(
          `https://en.wikipedia.org/w/api.php?action=query&format=json&prop=pageimages&generator=search&gsrsearch=${simpleQ}&gsrnamespace=0&gsrlimit=3&pithumbsize=500`,
          { timeout: 4000, headers: { 'User-Agent': 'HardwarePOSBot/1.0 (https://example.com; admin@example.com)' } },
        );
        const pages = data?.query?.pages;
        if (pages) {
          for (const pageId in pages) {
             const page = pages[pageId];
             if (page.thumbnail?.source && !page.thumbnail.source.toLowerCase().endsWith('.svg')) {
               return page.thumbnail.source;
             }
          }
        }
        return null;
      } catch {
        return null;
      }
    }
  }

  async searchMasterCatalog(query: string) {
    const adminShop = await this.prisma.shop.findFirst({
      where: { name: 'SYSTEM_ADMIN_SHOP' },
    });

    if (!adminShop) {
      return []; // Return empty if no master catalog exists
    }

    const products = await this.prisma.product.findMany({
      where: {
        tenantId: adminShop.id,
        isActive: true,
        OR: query
          ? [
              { name: { contains: query, mode: 'insensitive' } },
              { sku: { contains: query, mode: 'insensitive' } },
              { barcode: { contains: query, mode: 'insensitive' } },
              { description: { contains: query, mode: 'insensitive' } },
            ]
          : undefined,
      },
      include: {
        category: true,
        brand: true,
        unit: true,
        images: true,
      },
      take: 100, // Increased limit to show more results
    });

    return products;
  }

  async cloneToShop(
    shopId: string,
    masterProductId: string,
    payload: {
      warehouseId: string;
      branchId: string;
      purchasePrice: number;
      sellingPrice: number;
      quantity: number;
      createdBy: string;
      customName?: string;
    },
  ) {
    const masterProduct = await this.prisma.product.findUnique({
      where: { id: masterProductId },
      include: {
        category: true,
        brand: true,
        unit: true,
        images: true,
      },
    });

    if (!masterProduct) {
      throw new NotFoundException('Master product not found');
    }

    // 1. Resolve Category
    let categoryId: string | undefined;
    if (masterProduct.category) {
      let localCategory = await this.prisma.category.findFirst({
        where: { tenantId: shopId, name: { equals: masterProduct.category.name, mode: 'insensitive' } },
      });
      if (!localCategory) {
        localCategory = await this.prisma.category.create({
          data: { tenantId: shopId, name: masterProduct.category.name, isActive: true },
        });
      }
      categoryId = localCategory.id;
    }

    // 2. Resolve Brand
    let brandId: string | undefined;
    if (masterProduct.brand) {
      let localBrand = await this.prisma.brand.findFirst({
        where: { tenantId: shopId, name: { equals: masterProduct.brand.name, mode: 'insensitive' } },
      });
      if (!localBrand) {
        localBrand = await this.prisma.brand.create({
          data: { tenantId: shopId, name: masterProduct.brand.name, isActive: true },
        });
      }
      brandId = localBrand.id;
    }

    // 3. Resolve Unit
    let unitId: string | undefined;
    if (masterProduct.unit) {
      let localUnit = await this.prisma.unit.findFirst({
        where: { tenantId: shopId, name: { equals: masterProduct.unit.name, mode: 'insensitive' } },
      });
      if (!localUnit) {
        localUnit = await this.prisma.unit.create({
          data: { 
            tenantId: shopId, 
            name: masterProduct.unit.name, 
            abbreviation: masterProduct.unit.abbreviation 
          },
        });
      }
      unitId = localUnit.id;
    }

    // Ensure unique SKU/Barcode in target shop by appending random suffix if conflicts exist
    let newSku = masterProduct.sku;
    const existingSku = await this.prisma.product.findUnique({ where: { tenantId_sku: { tenantId: shopId, sku: newSku } } });
    if (existingSku) newSku = `${newSku}-${Math.floor(1000 + Math.random() * 9000)}`;

    let newBarcode = masterProduct.barcode;
    if (newBarcode) {
      const existingBarcode = await this.prisma.product.findUnique({ where: { tenantId_barcode: { tenantId: shopId, barcode: newBarcode } } });
      if (existingBarcode) newBarcode = `${newBarcode}-${Math.floor(1000 + Math.random() * 9000)}`;
    }

    // 4. Create the Cloned Product
    const clonedProduct = await this.prisma.product.create({
      data: {
        tenantId: shopId,
        name: payload.customName?.trim() || masterProduct.name,
        description: masterProduct.description,
        sku: newSku,
        barcode: newBarcode,
        categoryId: categoryId as string,
        brandId: brandId,
        unitId: unitId,
        purchasePrice: payload.purchasePrice,
        sellingPrice: payload.sellingPrice,
        taxCategory: masterProduct.taxCategory,
        sellType: masterProduct.sellType,
        measurementUnit: masterProduct.measurementUnit,
        isActive: true,
        createdBy: payload.createdBy,
        images: undefined, // We'll handle this in a separate query to allow async fetching without blocking the transaction if it was one. Actually Prisma doesn't strictly need it to be separate, but let's separate it to keep the code clean.
      },
    });

    // Handle Images
    let imageUrlToUse: string | null = null;
    
    if (masterProduct.images && masterProduct.images.length > 0) {
      // Use existing master image
      imageUrlToUse = masterProduct.images[0].imageUrl;
    } else {
      // Automatically fetch a web image if there is no image
      const categoryName = masterProduct.category?.name;
      imageUrlToUse = await this.fetchProductImage(clonedProduct.name, categoryName);
    }

    if (imageUrlToUse) {
      await this.prisma.productImage.create({
        data: {
          productId: clonedProduct.id,
          imageUrl: imageUrlToUse,
          isPrimary: true,
        }
      });
    }

    // 5. Create Initial Stock
    if (payload.quantity > 0) {
      await this.prisma.stock.create({
        data: {
          tenantId: shopId,
          productId: clonedProduct.id,
          warehouseId: payload.warehouseId,
          branchId: payload.branchId,
          quantity: payload.quantity,
          availableQuantity: payload.quantity,
        },
      });

      // Log movement
      await this.prisma.stockMovement.create({
        data: {
          tenantId: shopId,
          productId: clonedProduct.id,
          warehouseId: payload.warehouseId,
          movementType: 'IN',
          quantity: payload.quantity,
          afterQuantity: payload.quantity,
          referenceType: 'INITIAL_STOCK',
          createdBy: payload.createdBy,
        },
      });
    }

    // Return the full cloned product including images
    return this.prisma.product.findUnique({
      where: { id: clonedProduct.id },
      include: { images: true, category: true, brand: true, unit: true },
    });
  }
}
