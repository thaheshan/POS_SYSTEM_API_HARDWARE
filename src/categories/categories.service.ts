import { Inject, Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { Logger } from '@nestjs/common';
import {
  CategoryNotFoundException,
  CategorySelfParentException,
  CategoryDepthLimitExceededException,
  CategoryDeleteConflictException,
} from 'src/common/exceptions/category.exceptions';
import { CategoryNode } from 'src/categories/interfaces/category.interface';
import type { CacheClient } from 'src/cache/cache-client.interface';

@Injectable()
export class CategoriesService {
  private readonly logger = new Logger(CategoriesService.name);
  constructor(
    private prisma: PrismaService,
    @Inject('REDIS_CLIENT') private redis: CacheClient,
  ) {}

  // This method creates a new category for a given tenant. It takes the tenant ID and the category details from the CreateCategoryDto, calculates the category level based on its parent category (if provided), and then inserts the new category into the database. The method returns the created category object.
  async createCategory(
    tenant_id: string,
    createCategoryDto: CreateCategoryDto,
  ) {
    const { categoryName, parentCategoryId } = createCategoryDto;

    this.logger.log(
      `Creating category '${categoryName}' for tenant ${tenant_id}`,
    );

    const categoryLevel = await this.calculateCategoryLevel(
      tenant_id,
      parentCategoryId,
    );

    const category = await this.prisma.category.create({
      data: {
        tenantId: tenant_id,
        categoryLevel: categoryLevel,
        ...createCategoryDto,
      },
    });

    this.logger.log(
      `Category '${categoryName}' created with id ${category.id}`,
    );

    await this.clearTenantCache(tenant_id);

    return category;
  }

  // This method retrieves the category tree for a given tenant. It first checks if the tree is available in the cache and returns it if found. If not, it fetches all active categories for the tenant from the database, constructs a hierarchical tree structure from the flat list of categories, stores the result in the cache for future requests, and then returns the tree.
  async getCategoryTree(tenantId: string): Promise<CategoryNode[]> {
    const cacheKey = `cat_tree:${tenantId}`;

    const cachedString = await this.redis.get(cacheKey);
    if (cachedString) {
      this.logger.log(`Category tree cache hit for tenant ${tenantId}`);
      return JSON.parse(cachedString) as CategoryNode[];
    }

    this.logger.log(
      `Category tree cache miss for tenant ${tenantId}, fetching from DB`,
    );

    type FlatCategory = {
      id: string;
      categoryName: string;
      categoryCode: string;
      iconUrl: string | null;
      displayOrder: number;
      parentCategoryId?: string | null;
      _count?: { products?: number };
    };

    const flatCategories = (await this.prisma.category.findMany({
      where: { tenantId, isActive: true },
      orderBy: { displayOrder: 'asc' },
      include: {
        _count: {
          select: { products: true },
        },
      },
    })) as FlatCategory[];

    const categoryMap = new Map<string, CategoryNode>();
    const rootNodes: CategoryNode[] = [];

    flatCategories.forEach((cat) => {
      categoryMap.set(cat.id, {
        id: cat.id,
        categoryName:
          typeof cat.categoryName === 'string' ? cat.categoryName : '',
        categoryCode:
          typeof cat.categoryCode === 'string' ? cat.categoryCode : '',
        iconUrl: typeof cat.iconUrl === 'string' ? cat.iconUrl : null,
        displayOrder:
          typeof cat.displayOrder === 'number' ? cat.displayOrder : 0,
        productCount: cat._count?.products ?? 0,
        children: [],
      } as CategoryNode);
    });

    flatCategories.forEach((cat) => {
      const mappedCat = categoryMap.get(cat.id)!;
      if (cat.parentCategoryId) {
        const parent = categoryMap.get(cat.parentCategoryId);
        if (parent) {
          parent.children.push(mappedCat);
        }
      } else {
        rootNodes.push(mappedCat);
      }
    });

    // 5. Save to Cache (10 minutes = 600,000 ms in cache-manager v5)
    await this.redis.set(cacheKey, JSON.stringify(rootNodes), 'EX', 600);
    this.logger.log(`Category tree cached for tenant ${tenantId}`);

    return rootNodes;
  }

  // This method is used to update a category's details, including its name, display order, and parent category. It also handles the logic for calculating the category level based on its new parent and ensures that the category cannot be set as its own parent. After updating the category, it clears the relevant cache to ensure that subsequent reads reflect the updated data.
  async updateCategory(
    tenant_id: string,
    id: string,
    updateCategoryDto: UpdateCategoryDto,
  ) {
    const { categoryName, parentCategoryId, displayOrder } = updateCategoryDto;
    this.logger.log(`Updating category ${id} for tenant ${tenant_id}`);
    const existingCategory = await this.prisma.category.findFirst({
      where: { id, tenantId: tenant_id },
    });
    if (!existingCategory) {
      this.logger.warn(`Category ${id} not found for tenant ${tenant_id}`);
      throw new CategoryNotFoundException();
    }
    const updateData: Record<string, unknown> = {};
    if (categoryName) updateData.categoryName = categoryName;
    if (displayOrder !== undefined) updateData.displayOrder = displayOrder;

    // If they are moving the category to a new parent
    if (parentCategoryId !== undefined) {
      if (parentCategoryId === id) {
        this.logger.warn(
          `Attempted to set category ${id} as its own parent for tenant ${tenant_id}`,
        );
        throw new CategorySelfParentException();
      }

      const newLevel = await this.calculateCategoryLevel(
        tenant_id,
        parentCategoryId,
      );
      updateData.parentCategoryId = parentCategoryId;
      updateData.categoryLevel = newLevel;
    }

    const updatedCategory = await this.prisma.category.update({
      where: { id, tenantId: tenant_id },
      data: updateData,
    });

    this.logger.log(`Category ${id} updated for tenant ${tenant_id}`);
    await this.clearTenantCache(tenant_id);

    return updatedCategory;
  }

  // Delete Category method checks if the category to be deleted has any child categories. If it does, it throws a ConflictException to prevent deletion. If there are no child categories, it proceeds to delete the category from the database and then clears the relevant cache for the tenant to ensure that subsequent requests will not return stale data.
  async deleteCategory(tenant_id: string, id: string): Promise<void> {
    this.logger.log(`Deleting category ${id} for tenant ${tenant_id}`);
    const category = await this.prisma.category.findFirst({
      where: { id, tenantId: tenant_id },
    });

    if (!category) {
      this.logger.warn(`Category ${id} not found for tenant ${tenant_id}`);
      throw new CategoryNotFoundException('Category not found');
    }

    const childCount = await this.prisma.category.count({
      where: { parentCategoryId: id, tenantId: tenant_id },
    });

    if (childCount > 0) {
      this.logger.warn(
        `Cannot delete category ${id} for tenant ${tenant_id}: has child categories`,
      );
      throw new CategoryDeleteConflictException(
        'Cannot delete category with child categories',
      );
    }

    await this.prisma.category.deleteMany({
      where: { id, tenantId: tenant_id },
    });

    this.logger.log(`Category ${id} deleted for tenant ${tenant_id}`);
    await this.clearTenantCache(tenant_id);
  }

  // This private method calculates the category level based on its parent category. If there is no parent category, it returns 1 (indicating a top-level category). If there is a parent category, it retrieves the parent's level and checks against the maximum allowed depth defined in the tenant settings. If the new level exceeds the maximum depth, it throws an exception. Otherwise, it returns the calculated level for the new category.
  private async calculateCategoryLevel(
    tenantId: string,
    parentCategoryId?: string,
  ): Promise<number> {
    if (!parentCategoryId) {
      return 1;
    }
    const parent = await this.prisma.category.findFirst({
      where: {
        id: parentCategoryId,
        tenantId: tenantId,
      },
    });

    if (!parent) {
      this.logger.warn(
        `Parent category ${parentCategoryId} not found for tenant ${tenantId}`,
      );
      throw new CategoryNotFoundException('Parent category not found');
    }
    const tenantSetting = await this.prisma.tenantSetting.findFirst({
      where: { tenantId: tenantId },
    });
    const maxDepth = tenantSetting?.maxCategoryDepth ?? 3;

    const parentLevel = parent.categoryLevel ?? 1;

    if (parentLevel >= maxDepth) {
      this.logger.warn(`Category depth limit exceeded for tenant ${tenantId}`);
      throw new CategoryDepthLimitExceededException();
    }

    return parentLevel + 1;
  }

  async seedDefaultCategories(tenantId: string) {
    this.logger.log(`Seeding default categories for tenant ${tenantId}`);
    const defaultCategoryNames = [
      'PVC Items',
      'Electrical Items',
      'Bulbs & Lighting',
      'Nuts & Bolts & Fasteners',
      'Tools & Equipment',
      'Paint & Chemicals',
      'Hardware & Accessories',
      'Plumbing Items',
    ];

    // Map the names into the exact format Prisma expects
    const categoriesToInsert = defaultCategoryNames.map((name, index) => ({
      tenantId: tenantId,
      categoryName: name,
      categoryCode: `CAT${index + 1}`,
      parentCategoryId: null,
      categoryLevel: 1,
      displayOrder: index + 1,
      isActive: true,
    }));

    // Use createMany for a fast, single bulk-insert
    const result = await this.prisma.category.createMany({
      data: categoriesToInsert,
      skipDuplicates: true, // Prevents crashing if ran twice by accident
    });

    // Invalidate the cache so the new shop sees these immediately
    await this.clearTenantCache(tenantId);

    this.logger.log(
      `Seeded ${result.count} default categories for tenant ${tenantId}`,
    );
    return {
      success: true,
      message: `Successfully seeded ${result.count} default categories.`,
    };
  }

  getDescendantCategoryIds(
    targetId: string,
    treeNodes: CategoryNode[],
  ): string[] {
    const ids: string[] = [];
    let targetNode: CategoryNode | null = null;

    const findNode = (nodes: CategoryNode[]) => {
      for (const node of nodes) {
        if (node.id === targetId) {
          targetNode = node;
          return;
        }
        if (node.children.length > 0) findNode(node.children);
      }
    };
    findNode(treeNodes);

    if (targetNode) {
      const traverse = (node: CategoryNode) => {
        ids.push(node.id);
        node.children.forEach(traverse);
      };
      traverse(targetNode);
    }

    return ids;
  }

  // This method retrieves the IDs of all descendant categories for a given category ID and tenant. It first fetches the entire category tree for the tenant, then uses a helper method to traverse the tree and collect the IDs of all descendant categories (including the specified category itself). This is useful for filtering products by category and its subcategories.
  async getDescendantCategoryIdsForFilter(
    categoryId: string,
    tenantId: string,
  ): Promise<string[]> {
    const tree = await this.getCategoryTree(tenantId);
    return this.getDescendantCategoryIds(categoryId, tree);
  }

  // This private method is responsible for clearing the cached category tree for a specific tenant. It constructs the cache key using the tenant ID and then deletes the corresponding entry from the cache. This is typically called after updating a category to ensure that subsequent requests will fetch the updated category tree from the database rather than returning stale data from the cache.
  private async clearTenantCache(tenantId: string) {
    const cacheKey = `cat_tree:${tenantId}`;
    await this.redis.del(cacheKey);
    this.logger.log(`Cleared category tree cache for tenant ${tenantId}`);
  }
}
