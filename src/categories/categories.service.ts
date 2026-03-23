import { Inject, Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { Cache, CACHE_MANAGER } from '@nestjs/cache-manager';
import { CategoryNode } from 'src/common/interfaces/category.interface';
import {
  CategoryNotFoundException,
  CategorySelfParentException,
  CategoryDepthLimitExceededException,
  CategoryDeleteConflictException,
} from 'src/common/exceptions/category.exceptions';

@Injectable()
export class CategoriesService {
  constructor(
    private prisma: PrismaService,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
  ) {}

  // This method creates a new category for a given tenant. It takes the tenant ID and the category details from the CreateCategoryDto, calculates the category level based on its parent category (if provided), and then inserts the new category into the database. The method returns the created category object.
  async createCategory(
    tenant_id: string,
    createCategoryDto: CreateCategoryDto,
  ) {
    const { name, parent_category_id, display_order } = createCategoryDto;
    const category_level = await this.calculateCategoryLevel(
      tenant_id,
      parent_category_id,
    );
    const category = await this.prisma.category.create({
      data: {
        tenant_id,
        name,
        parent_category_id: parent_category_id || null,
        category_level,
        display_order: display_order || 0,
      },
    });
    await this.clearTenantCache(tenant_id);
    return category;
  }

  // This method retrieves the category tree for a given tenant. It first checks if the tree is available in the cache and returns it if found. If not, it fetches all active categories for the tenant from the database, constructs a hierarchical tree structure from the flat list of categories, stores the result in the cache for future requests, and then returns the tree.
  async getCategoryTree(tenant_id: string): Promise<CategoryNode[]> {
    const cache_key = `cat_tree:${tenant_id}`;

    const cachedTree = await this.cacheManager.get<CategoryNode[]>(cache_key);
    if (cachedTree) {
      return cachedTree;
    }

    const flatCategories = await this.prisma.category.findMany({
      where: { tenant_id, is_active: true },
      orderBy: { display_order: 'asc' },
      include: {
        _count: {
          select: {
            products: true,
          },
        },
      },
    });

    const categoryMap = new Map<string, CategoryNode>();
    const rootNodes: CategoryNode[] = [];

    flatCategories.forEach((cat) => {
      categoryMap.set(cat.id, {
        id: cat.id,
        name: cat.name,
        product_count: cat._count.products,
        children: [],
      });
    });

    flatCategories.forEach((cat) => {
      const mappedCat = categoryMap.get(cat.id)!;
      if (cat.parent_category_id) {
        const parent = categoryMap.get(cat.parent_category_id);
        if (parent) {
          parent.children.push(mappedCat);
        }
      } else {
        rootNodes.push(mappedCat);
      }
    });

    await this.cacheManager.set(cache_key, rootNodes, 600); // Cache for 10 minutes
    return rootNodes;
  }

  // This method is used to update a category's details, including its name, display order, and parent category. It also handles the logic for calculating the category level based on its new parent and ensures that the category cannot be set as its own parent. After updating the category, it clears the relevant cache to ensure that subsequent reads reflect the updated data.
  async updateCategory(
    tenant_id: string,
    id: string,
    updateCategoryDto: UpdateCategoryDto,
  ) {
    const { name, parent_category_id, display_order } = updateCategoryDto;
    const existingCategory = await this.prisma.category.findFirst({
      where: { id, tenant_id },
    });
    if (!existingCategory) {
      throw new CategoryNotFoundException();
    }
    const updateData: Record<string, unknown> = {};
    if (name) updateData.name = name;
    if (display_order !== undefined) updateData.display_order = display_order;

    // If they are moving the category to a new parent
    if (parent_category_id !== undefined) {
      if (parent_category_id === id) {
        throw new CategorySelfParentException();
      }

      const newLevel = await this.calculateCategoryLevel(
        tenant_id,
        parent_category_id,
      );
      updateData.parent_category_id = parent_category_id;
      updateData.category_level = newLevel;
    }

    const updatedCategory = await this.prisma.category.update({
      where: { id, tenant_id },
      data: updateData,
    });

    await this.clearTenantCache(tenant_id);

    return updatedCategory;
  }

  // Delete Category method checks if the category to be deleted has any child categories. If it does, it throws a ConflictException to prevent deletion. If there are no child categories, it proceeds to delete the category from the database and then clears the relevant cache for the tenant to ensure that subsequent requests will not return stale data.
  async deleteCategory(tenant_id: string, id: string): Promise<void> {
    const category = await this.prisma.category.findFirst({
      where: { id, tenant_id },
    });

    if (!category) {
      throw new CategoryNotFoundException('Category not found');
    }

    const childCount = await this.prisma.category.count({
      where: { parent_category_id: id, tenant_id },
    });

    if (childCount > 0) {
      throw new CategoryDeleteConflictException(
        'Cannot delete category with child categories',
      );
    }

    await this.prisma.category.deleteMany({
      where: { id, tenant_id },
    });

    await this.clearTenantCache(tenant_id);
  }

  // This private method calculates the category level based on its parent category. If there is no parent category, it returns 1 (indicating a top-level category). If there is a parent category, it retrieves the parent's level and checks against the maximum allowed depth defined in the tenant settings. If the new level exceeds the maximum depth, it throws an exception. Otherwise, it returns the calculated level for the new category.
  private async calculateCategoryLevel(
    tenant_id: string,
    parent_category_id?: string,
  ): Promise<number> {
    if (!parent_category_id) {
      return 1;
    }
    const parent = await this.prisma.category.findUnique({
      where: { id: parent_category_id, tenant_id },
    });

    if (!parent) {
      throw new CategoryNotFoundException('Parent category not found');
    }

    const tenantSetting = await this.prisma.tenantSetting.findUnique({
      where: { tenant_id },
    });
    const maxDepth = tenantSetting?.max_category_depth ?? 3;
    if (parent.category_level >= maxDepth) {
      throw new CategoryDepthLimitExceededException();
    }
    return parent.category_level + 1;
  }

  getDescendantCategoryIds(rootId: string, tree: CategoryNode[]): string[] {
    const ids: string[] = [];

    const traverse = (node: CategoryNode) => {
      ids.push(node.id);
      node.children.forEach(traverse);
    };

    const rootNode = tree.find((cat) => cat.id === rootId);
    if (rootNode) traverse(rootNode);

    return ids;
  }

  // This method retrieves the IDs of all descendant categories for a given category ID and tenant. It first fetches the entire category tree for the tenant, then uses a helper method to traverse the tree and collect the IDs of all descendant categories (including the specified category itself). This is useful for filtering products by category and its subcategories.
  async getDescendantCategoryIdsForFilter(
    categoryId: string,
    tenant_id: string,
  ): Promise<string[]> {
    const tree = await this.getCategoryTree(tenant_id);
    return this.getDescendantCategoryIds(categoryId, tree);
  }

  // This private method is responsible for clearing the cached category tree for a specific tenant. It constructs the cache key using the tenant ID and then deletes the corresponding entry from the cache. This is typically called after updating a category to ensure that subsequent requests will fetch the updated category tree from the database rather than returning stale data from the cache.
  private async clearTenantCache(tenant_id: string) {
    const cacheKey = `cat_tree:${tenant_id}`;
    await this.cacheManager.del(cacheKey);
  }
}
