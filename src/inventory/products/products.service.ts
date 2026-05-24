import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateProductDto } from './dto/create-product.dto';

@Injectable()
export class ProductsService {
  constructor(private prisma: PrismaService) {}

  async createProduct(dto: CreateProductDto, tenantId: string, createdBy: string) {
    // 1. Check if category exists
    const category = await this.prisma.category.findUnique({
      where: { id: dto.categoryId },
    });
    if (!category || category.tenantId !== tenantId) {
      throw new NotFoundException('Category not found');
    }

    // 2. Validate SKU uniqueness
    const existingSku = await this.prisma.product.findUnique({
      where: { tenantId_sku: { tenantId, sku: dto.sku } },
    });
    if (existingSku) {
      throw new BadRequestException('Product with this SKU already exists');
    }

    // 3. Create the product
    const product = await this.prisma.product.create({
      data: {
        tenantId,
        name: dto.name,
        sku: dto.sku,
        description: dto.description,
        categoryId: dto.categoryId,
        brandId: dto.brandId,
        unitId: dto.unitId,
        purchasePrice: dto.purchasePrice,
        sellingPrice: dto.sellingPrice,
        taxCategory: dto.taxCategory as any,
        taxRate: dto.taxRate,
        minimumStockLevel: dto.minimumStockLevel,
        createdBy,
      },
    });

    // 4. If initial stock is provided, get the first warehouse for the branch and add stock
    const initialStock = dto.initialStock || 0;
    if (initialStock > 0 && dto.warehouseId && dto.branchId) {
      await this.prisma.stock.create({
        data: {
          tenantId,
          productId: product.id,
          warehouseId: dto.warehouseId,
          branchId: dto.branchId,
          quantity: initialStock,
          availableQuantity: initialStock,
        },
      });

      await this.prisma.stockMovement.create({
        data: {
          tenantId,
          productId: product.id,
          warehouseId: dto.warehouseId,
          movementType: 'IN',
          quantity: initialStock,
          beforeQuantity: 0,
          afterQuantity: initialStock,
          referenceType: 'INITIAL_STOCK',
          referenceId: product.id,
          createdBy,
        },
      });
    }

    return product;
  }

  async getProducts(tenantId: string) {
    return this.prisma.product.findMany({
      where: { tenantId },
      include: {
        category: true,
        brand: true,
        unit: true,
      },
    });
  }

  async getCategories(tenantId: string) {
    return this.prisma.category.findMany({
      where: { tenantId, isActive: true },
      orderBy: { name: 'asc' },
    });
  }

  async createCategory(tenantId: string, name: string, description?: string) {
    return this.prisma.category.create({
      data: {
        tenantId,
        name,
        description,
      },
    });
  }
}
