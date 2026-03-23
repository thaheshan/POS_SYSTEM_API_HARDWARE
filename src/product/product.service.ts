import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, TaxCategory } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { Inject } from '@nestjs/common';

export interface CacheClient {
  get(key: string): Promise<string | null>;
  set(
    key: string,
    value: string,
    mode: 'EX',
    ttlSeconds: number,
  ): Promise<'OK' | null>;
  del(...keys: string[]): Promise<number>;
}

@Injectable()
export class ProductService {
  private readonly barcodeCacheTtlSeconds = 300;

  constructor(
    private readonly prisma: PrismaService,
    @Inject('REDIS_CLIENT') private readonly redis: CacheClient,
  ) {}

  async create(
    createProductDto: CreateProductDto,
    tenantId?: string,
    branchId?: string,
  ) {
    const tenant = this.ensureTenant(tenantId);

    if (createProductDto.has_variants && !createProductDto.variants?.length) {
      throw new BadRequestException('VARIANTS_REQUIRED');
    }

    const sku =
      createProductDto.sku ??
      (await this.generateSku(tenant, createProductDto.category_id));

    const markupPercentage = this.calculateMarkup(
      createProductDto.selling_price,
      createProductDto.purchase_price,
    );

    try {
      const result = await this.prisma.$transaction(async (tx) => {
        const product = await tx.product.create({
          data: {
            tenantId: tenant,
            name: createProductDto.name,
            description: createProductDto.description,
            sku,
            barcode: createProductDto.barcode,
            categoryId: createProductDto.category_id,
            brandId: createProductDto.brand_id,
            unitId: createProductDto.unit_id,
            purchasePrice: createProductDto.purchase_price,
            sellingPrice: createProductDto.selling_price,
            minimumSellingPrice: createProductDto.minimum_selling_price,
            markupPercentage,
            taxCategory: createProductDto.tax_category as TaxCategory,
            minimumStockLevel: createProductDto.minimum_stock_level,
            reorderQuantity: createProductDto.reorder_quantity,
            hasVariants: createProductDto.has_variants,
            warrantyMonths: createProductDto.warranty_months,
          },
        });

        const variants = createProductDto.variants ?? [];
        if (createProductDto.has_variants && variants.length) {
          const variantData = variants.map((variant, index) => ({
            tenantId: tenant,
            productId: product.id,
            variantName: variant.variant_name,
            sku: variant.sku ?? `${sku}-V${index + 1}`,
            barcode: variant.barcode,
            purchasePrice: variant.purchase_price,
            sellingPrice: variant.selling_price,
          }));

          await tx.productVariant.createMany({ data: variantData });

          const createdVariants = await tx.productVariant.findMany({
            where: { tenantId: tenant, productId: product.id },
            select: { id: true },
          });
          await tx.stock.createMany({
            data: createdVariants.map((variant) => ({
              tenantId: tenant,
              productId: product.id,
              variantId: variant.id,
              branchId,
              quantity: new Prisma.Decimal(0),
              reservedQuantity: new Prisma.Decimal(0),
            })),
          });
        } else {
          await tx.stock.create({
            data: {
              tenantId: tenant,
              productId: product.id,
              branchId,
              quantity: new Prisma.Decimal(0),
              reservedQuantity: new Prisma.Decimal(0),
            },
          });
        }

        return product;
      });

      return result;
    } catch (error) {
      this.handlePrismaConflict(error);
      throw error;
    }
  }

  async findAll(params: {
    page?: string;
    limit?: string;
    category?: string;
    brand?: string;
    taxCategory?: string;
    lowStock?: string;
    search?: string;
    tenantId?: string;
  }) {
    const tenant = this.ensureTenant(params.tenantId);

    const page = Math.max(1, Number(params.page ?? 1));
    const limit = Math.min(100, Math.max(1, Number(params.limit ?? 20)));
    const skip = (page - 1) * limit;

    const where: Prisma.ProductWhereInput = {
      tenantId: tenant,
      isActive: true,
      ...(params.category ? { categoryId: params.category } : {}),
      ...(params.brand ? { brandId: params.brand } : {}),
      ...(params.taxCategory
        ? { taxCategory: params.taxCategory as TaxCategory }
        : {}),
      ...(params.search
        ? {
            OR: [
              { name: { contains: params.search, mode: 'insensitive' } },
              { sku: { contains: params.search, mode: 'insensitive' } },
            ],
          }
        : {}),
    };

    const [products, total, stockSummary] = await Promise.all([
      this.prisma.product.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        include: {
          variants: {
            select: { id: true, sellingPrice: true },
          },
        },
      }),
      this.prisma.product.count({ where }),
      this.prisma.stock.groupBy({
        by: ['productId'],
        where: { tenantId: tenant },
        orderBy: { productId: 'asc' },
        _sum: { quantity: true, reservedQuantity: true },
      }),
    ]);

    const stockMap = new Map(
      stockSummary.map((entry) => [
        entry.productId,
        {
          currentStock: Number(entry._sum?.quantity ?? 0),
          reservedStock: Number(entry._sum?.reservedQuantity ?? 0),
        },
      ]),
    );

    let items = products.map((product) => {
      const stock = stockMap.get(product.id) ?? {
        currentStock: 0,
        reservedStock: 0,
      };
      const mainVariantPrice = product.hasVariants
        ? (product.variants[0]?.sellingPrice ?? product.sellingPrice)
        : product.sellingPrice;

      return {
        ...product,
        main_variant_price: mainVariantPrice,
        stock_summary: stock,
      };
    });

    if (params.lowStock === 'true') {
      items = items.filter((item) => {
        if (item.minimumStockLevel == null) {
          return false;
        }
        return (
          Number(item.minimumStockLevel) >= item.stock_summary.currentStock
        );
      });
    }

    return {
      data: items,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(id: string, tenantId?: string) {
    const tenant = this.ensureTenant(tenantId);

    const product = await this.prisma.product.findFirst({
      where: { id, tenantId: tenant, isActive: true },
      include: {
        variants: true,
        stocks: true,
      },
    });

    if (!product) {
      throw new NotFoundException('PRODUCT_NOT_FOUND');
    }

    return product;
  }

  async update(
    id: string,
    updateProductDto: UpdateProductDto,
    tenantId?: string,
  ) {
    const tenant = this.ensureTenant(tenantId);

    const existing = await this.prisma.product.findFirst({
      where: { id, tenantId: tenant },
      include: { variants: true },
    });

    if (!existing) {
      throw new NotFoundException('PRODUCT_NOT_FOUND');
    }

    const sellingPrice =
      updateProductDto.selling_price ??
      (existing.sellingPrice ? Number(existing.sellingPrice) : undefined);
    const purchasePrice =
      updateProductDto.purchase_price ??
      (existing.purchasePrice ? Number(existing.purchasePrice) : undefined);

    const markupPercentage = this.calculateMarkup(sellingPrice, purchasePrice);

    try {
      const updated = await this.prisma.product.update({
        where: { id },
        data: {
          name: updateProductDto.name,
          description: updateProductDto.description,
          sku: updateProductDto.sku,
          barcode: updateProductDto.barcode,
          categoryId: updateProductDto.category_id,
          brandId: updateProductDto.brand_id,
          unitId: updateProductDto.unit_id,
          purchasePrice: updateProductDto.purchase_price,
          sellingPrice: updateProductDto.selling_price,
          minimumSellingPrice: updateProductDto.minimum_selling_price,
          markupPercentage,
          taxCategory: updateProductDto.tax_category as TaxCategory,
          minimumStockLevel: updateProductDto.minimum_stock_level,
          reorderQuantity: updateProductDto.reorder_quantity,
          hasVariants: updateProductDto.has_variants,
          warrantyMonths: updateProductDto.warranty_months,
        },
      });

      await this.invalidateBarcodeCache(tenant, existing);
      return updated;
    } catch (error) {
      this.handlePrismaConflict(error);
      throw error;
    }
  }

  async remove(id: string, tenantId?: string) {
    const tenant = this.ensureTenant(tenantId);

    const existing = await this.prisma.product.findFirst({
      where: { id, tenantId: tenant },
      include: { variants: true },
    });

    if (!existing) {
      throw new NotFoundException('PRODUCT_NOT_FOUND');
    }

    const updated = await this.prisma.product.update({
      where: { id },
      data: { isActive: false },
    });

    await this.invalidateBarcodeCache(tenant, existing);
    return updated;
  }

  async findByBarcode(tenantId: string | undefined, barcode: string) {
    const tenant = this.ensureTenant(tenantId);
    const cacheKey = this.getBarcodeCacheKey(tenant, barcode);
    const cached = await this.redis.get(cacheKey);
    if (cached) {
      return JSON.parse(cached);
    }

    const variant = await this.prisma.productVariant.findFirst({
      where: { tenantId: tenant, barcode, isActive: true },
      include: { product: true },
    });

    if (variant) {
      const stock = await this.prisma.stock.aggregate({
        where: { tenantId: tenant, variantId: variant.id },
        _sum: { quantity: true, reservedQuantity: true },
      });
      const response = {
        product: variant.product,
        variant,
        current_stock: Number(stock._sum.quantity ?? 0),
        reserved_stock: Number(stock._sum.reservedQuantity ?? 0),
        selling_price: variant.sellingPrice ?? variant.product.sellingPrice,
        minimum_selling_price: variant.product.minimumSellingPrice,
        tax_category: variant.product.taxCategory,
      };
      await this.redis.set(
        cacheKey,
        JSON.stringify(response),
        'EX',
        this.barcodeCacheTtlSeconds,
      );
      return response;
    }

    const product = await this.prisma.product.findFirst({
      where: { tenantId: tenant, barcode, isActive: true },
    });

    if (!product) {
      throw new NotFoundException('BARCODE_NOT_FOUND');
    }

    const stock = await this.prisma.stock.aggregate({
      where: { tenantId: tenant, productId: product.id, variantId: null },
      _sum: { quantity: true, reservedQuantity: true },
    });

    const response = {
      product,
      variant: null,
      current_stock: Number(stock._sum.quantity ?? 0),
      reserved_stock: Number(stock._sum.reservedQuantity ?? 0),
      selling_price: product.sellingPrice,
      minimum_selling_price: product.minimumSellingPrice,
      tax_category: product.taxCategory,
    };

    await this.redis.set(
      cacheKey,
      JSON.stringify(response),
      'EX',
      this.barcodeCacheTtlSeconds,
    );
    return response;
  }

  async findBySku(tenantId: string | undefined, sku: string) {
    const tenant = this.ensureTenant(tenantId);

    const variant = await this.prisma.productVariant.findFirst({
      where: { tenantId: tenant, sku, isActive: true },
      include: { product: true },
    });

    if (variant) {
      return { product: variant.product, variant };
    }

    const product = await this.prisma.product.findFirst({
      where: { tenantId: tenant, sku, isActive: true },
      include: { variants: true, stocks: true },
    });

    if (!product) {
      throw new NotFoundException('SKU_NOT_FOUND');
    }

    return { product, variant: null };
  }

  private ensureTenant(tenantId?: string) {
    if (!tenantId) {
      throw new BadRequestException('TENANT_ID_REQUIRED');
    }
    return tenantId;
  }

  private async generateSku(tenantId: string, categoryId: string) {
    const category = await this.prisma.category.findFirst({
      where: { id: categoryId, tenantId, isActive: true },
      select: { categoryCode: true },
    });

    if (!category) {
      throw new BadRequestException('INVALID_CATEGORY');
    }

    const year = new Date().getFullYear();
    const sequence = await this.prisma.productSkuSequence.upsert({
      where: {
        tenantId_categoryId_year: {
          tenantId,
          categoryId,
          year,
        },
      },
      update: { seq: { increment: 1 } },
      create: {
        tenantId,
        categoryId,
        year,
        seq: 1,
      },
    });

    const padded = sequence.seq.toString().padStart(6, '0');
    return `SKU-${category.categoryCode}-${year}-${padded}`;
  }

  private calculateMarkup(selling?: number, purchase?: number) {
    if (selling == null || purchase == null || purchase === 0) {
      return null;
    }

    const value = ((selling - purchase) / purchase) * 100;
    return new Prisma.Decimal(value.toFixed(2));
  }

  private getBarcodeCacheKey(tenantId: string, barcode: string) {
    return `prod_bc:${tenantId}:${barcode}`;
  }

  private async invalidateBarcodeCache(
    tenantId: string,
    product: {
      barcode: string | null;
      variants?: { barcode: string | null }[];
    },
  ) {
    const keys = [
      ...(product.barcode
        ? [this.getBarcodeCacheKey(tenantId, product.barcode)]
        : []),
      ...(product.variants ?? [])
        .filter((variant) => variant.barcode)
        .map((variant) =>
          this.getBarcodeCacheKey(tenantId, variant.barcode as string),
        ),
    ];

    if (keys.length) {
      await this.redis.del(...keys);
    }
  }

  private handlePrismaConflict(error: unknown) {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === 'P2002') {
        const target = (error.meta?.target as string[]) ?? [];
        if (target.includes('barcode')) {
          throw new ConflictException('DUPLICATE_BARCODE');
        }
        if (target.includes('sku')) {
          throw new ConflictException('DUPLICATE_SKU');
        }
        throw new ConflictException('DUPLICATE_VALUE');
      }
    }
  }
}
