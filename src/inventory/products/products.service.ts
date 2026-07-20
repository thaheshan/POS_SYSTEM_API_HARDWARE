import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateProductDto } from './dto/create-product.dto';
import { StorageClient } from '@supabase/storage-js';
import { UpdateProductDiscountConfigDto } from './dto/update-product-discount-config.dto';
import { ApproveProductDiscountDto } from './dto/approve-product-discount.dto';

@Injectable()
export class ProductsService {
  private storage: StorageClient | null = null;

  constructor(private prisma: PrismaService) {
    // Use StorageClient directly — avoids WebSocket/Realtime issues on Node.js 20
    const supabaseUrl = process.env.SUPABASE_URL || '';
    const supabaseKey =
      process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY || '';
    if (supabaseUrl && supabaseKey) {
      this.storage = new StorageClient(`${supabaseUrl}/storage/v1`, {
        apikey: supabaseKey,
        Authorization: `Bearer ${supabaseKey}`,
      });
    } else {
      console.warn(
        'Supabase URL or Key not found in environment variables. Image uploads will fail.',
      );
    }
  }

  async createProduct(
    dto: CreateProductDto,
    tenantId: string,
    createdBy: string,
    imageFile?: any,
  ) {
    try {
      console.log('Creating product with DTO:', dto);
      // Ensure numeric fields are parsed since FormData sends strings
      const categoryId = dto.categoryId;
      const purchasePrice = dto.purchasePrice
        ? Number(dto.purchasePrice)
        : undefined;
      const sellingPrice = Number(dto.sellingPrice);
      const taxRate = dto.taxRate ? Number(dto.taxRate) : undefined;
      const minimumStockLevel = dto.minimumStockLevel
        ? Number(dto.minimumStockLevel)
        : undefined;
      const initialStock = dto.initialStock ? Number(dto.initialStock) : 0;

      // 1. Check if category exists
      const category = await this.prisma.category.findUnique({
        where: { id: categoryId },
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
          categoryId: categoryId,
          brandId: dto.brandId,
          unitId: dto.unitId,
          purchasePrice: purchasePrice,
          sellingPrice: sellingPrice,
          taxCategory: dto.taxCategory as any,
          taxRate: taxRate,
          minimumStockLevel: minimumStockLevel,
          sellType: dto.sellType || 'FIX',
          measurementUnit: dto.measurementUnit,
          createdBy,
        },
      });
      console.log('Product created:', product.id);

      // 4. Upload Image if provided
      console.log('Image file received:', !!imageFile);
      if (imageFile) {
        console.log('Image details:', {
          originalname: imageFile.originalname,
          mimetype: imageFile.mimetype,
          size: imageFile.size,
          hasBuffer: !!imageFile.buffer,
        });
      }

      if (imageFile && this.storage) {
        try {
          const fileExt = imageFile.originalname.split('.').pop();
          const fileName = `${tenantId}/${product.id}_${Date.now()}.${fileExt}`;
          console.log(`Attempting to upload to product-images/${fileName}`);

          const { data, error } = await this.storage
            .from('product-images')
            .upload(fileName, imageFile.buffer, {
              contentType: imageFile.mimetype,
              upsert: true,
            });

          if (error) {
            console.error(
              'Supabase upload error details:',
              JSON.stringify(error, null, 2),
            );
            console.error('Raw Supabase error:', error);
          } else {
            console.log('Supabase upload success, getting public URL...');
            const { data: publicUrlData } = this.storage
              .from('product-images')
              .getPublicUrl(fileName);

            if (publicUrlData && publicUrlData.publicUrl) {
              await this.prisma.productImage.create({
                data: {
                  productId: product.id,
                  imageUrl: publicUrlData.publicUrl,
                  isPrimary: true,
                },
              });
              console.log(
                'Image linked to product in DB:',
                publicUrlData.publicUrl,
              );
            } else {
              console.warn('Failed to retrieve public URL from Supabase');
            }
          }
        } catch (uploadError) {
          console.error('Exception during image upload:', uploadError);
        }
      } else if (!this.storage) {
        console.warn('Supabase storage client is not initialized');
      }

      // 5. If initial stock is provided or 0, resolve or auto-create a warehouse
      if (initialStock >= 0) {
        let warehouseId = dto.warehouseId;
        let branchId = dto.branchId;

        // Auto-resolve branch and warehouse if not provided
        if (!warehouseId || !branchId) {
          let firstWarehouse = await this.prisma.warehouse.findFirst({
            where: { tenantId, isActive: true },
          });

          // No warehouse exists yet — auto-create a default branch + warehouse
          if (!firstWarehouse) {
            console.log(
              'No warehouse found for tenant. Auto-creating default Branch + Warehouse...',
            );

            // Create default branch if needed
            let firstBranch = await this.prisma.branch.findFirst({
              where: { tenantId, isActive: true },
            });

            if (!firstBranch) {
              firstBranch = await this.prisma.branch.create({
                data: {
                  tenantId,
                  name: 'Main Branch',
                  code: `${tenantId.substring(0, 8).toUpperCase()}-BR01`,
                  isActive: true,
                },
              });
              console.log('Created default branch:', firstBranch.id);
            }

            firstWarehouse = await this.prisma.warehouse.create({
              data: {
                tenantId,
                branchId: firstBranch.id,
                name: 'Main Warehouse',
                code: `${tenantId.substring(0, 8).toUpperCase()}-WH01`,
                isActive: true,
              },
            });
            console.log('Created default warehouse:', firstWarehouse.id);
          }

          warehouseId = firstWarehouse.id;
          branchId = firstWarehouse.branchId;
        }

        console.log(
          'Resolved warehouseId:',
          warehouseId,
          'branchId:',
          branchId,
        );

        if (warehouseId && branchId) {
          await this.prisma.stock.create({
            data: {
              tenantId,
              productId: product.id,
              warehouseId: warehouseId,
              branchId: branchId,
              quantity: initialStock,
              availableQuantity: initialStock,
            },
          });
          console.log('Stock created');

          await this.prisma.stockMovement.create({
            data: {
              tenantId,
              productId: product.id,
              warehouseId: warehouseId,
              movementType: 'IN',
              quantity: initialStock,
              beforeQuantity: 0,
              afterQuantity: initialStock,
              referenceType: 'INITIAL_STOCK',
              referenceId: product.id,
              createdBy,
            },
          });
          console.log('Stock movement created');
        }
      }

      return product;
    } catch (error) {
      console.error('Error in createProduct:', error);
      throw error;
    }
  }

  async getProducts(tenantId: string) {
    return this.prisma.product.findMany({
      where: { tenantId, isActive: true },
      include: {
        category: true,
        brand: true,
        unit: true,
        images: true,
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

  async deleteProduct(productId: string, tenantId: string) {
    // Verify ownership
    const product = await this.prisma.product.findUnique({
      where: { id: productId },
    });
    if (!product || product.tenantId !== tenantId) {
      throw new NotFoundException('Product not found');
    }

    // Soft-delete strategy: mark the product inactive so all existing
    // sales invoices, GRNs, and return records that reference this
    // product keep their FK intact and historical data is preserved.
    // Only inventory-only records (stock levels, movements, images,
    // supplier links) are physically removed since they have no
    // reporting value after the product is discontinued.
    await this.prisma.$transaction([
      // Remove inventory records that are safe to purge
      this.prisma.supplierProduct.deleteMany({ where: { productId } }),
      this.prisma.stockMovement.deleteMany({ where: { productId } }),
      this.prisma.stock.deleteMany({ where: { productId } }),
      this.prisma.productImage.deleteMany({ where: { productId } }),
      // Soft-delete the product itself
      this.prisma.product.update({
        where: { id: productId },
        data: { isActive: false },
      }),
    ]);

    return { success: true, message: 'Product deleted successfully' };
  }

  async updateProduct(
    productId: string,
    dto: any,
    tenantId: string,
    updatedBy: string,
  ) {
    try {
      console.log('Updating product ID:', productId, 'with DTO:', dto);

      // Verify product ownership and existence
      const existingProduct = await this.prisma.product.findUnique({
        where: { id: productId },
      });
      if (!existingProduct || existingProduct.tenantId !== tenantId) {
        throw new NotFoundException('Product not found');
      }

      // If SKU is being changed, check if new SKU is already in use by another product
      if (dto.sku && dto.sku !== existingProduct.sku) {
        const existingSku = await this.prisma.product.findUnique({
          where: { tenantId_sku: { tenantId, sku: dto.sku } },
        });
        if (existingSku) {
          throw new BadRequestException('Product with this SKU already exists');
        }
      }

      // If categoryId is provided, verify it exists
      if (dto.categoryId) {
        const category = await this.prisma.category.findUnique({
          where: { id: dto.categoryId },
        });
        if (!category || category.tenantId !== tenantId) {
          throw new NotFoundException('Category not found');
        }
      }

      // Parse numbers safely
      const purchasePrice =
        dto.purchasePrice !== undefined ? Number(dto.purchasePrice) : undefined;
      const sellingPrice =
        dto.sellingPrice !== undefined ? Number(dto.sellingPrice) : undefined;
      const minimumStockLevel =
        dto.minimumStockLevel !== undefined
          ? Number(dto.minimumStockLevel)
          : undefined;
      const maximumStockLevel =
        dto.maximumStockLevel !== undefined
          ? Number(dto.maximumStockLevel)
          : undefined;

      // Update product core fields
      const product = await this.prisma.product.update({
        where: { id: productId },
        data: {
          name: dto.name,
          sku: dto.sku,
          description: dto.description,
          categoryId: dto.categoryId,
          brandId: dto.brandId,
          unitId: dto.unitId,
          purchasePrice: purchasePrice,
          sellingPrice: sellingPrice,
          minimumStockLevel: minimumStockLevel,
          maximumStockLevel: maximumStockLevel,
        },
      });

      // Update stock quantity and warehouse if provided
      if (dto.qty !== undefined && dto.warehouseId) {
        const targetQuantity = Number(dto.qty);

        // Find existing stock for this product + warehouse
        const existingStock = await this.prisma.stock.findFirst({
          where: {
            productId,
            warehouseId: dto.warehouseId,
            tenantId,
          },
        });

        const warehouse = await this.prisma.warehouse.findUnique({
          where: { id: dto.warehouseId },
        });
        const branchId = warehouse?.branchId;

        if (branchId) {
          if (existingStock) {
            const beforeQty = Number(existingStock.quantity);
            const diff = targetQuantity - beforeQty;

            if (diff !== 0) {
              // Update stock
              await this.prisma.stock.update({
                where: { id: existingStock.id },
                data: {
                  quantity: targetQuantity,
                  availableQuantity:
                    targetQuantity - Number(existingStock.reservedQuantity),
                },
              });

              // Create stock movement
              await this.prisma.stockMovement.create({
                data: {
                  tenantId,
                  productId,
                  warehouseId: dto.warehouseId,
                  movementType: 'ADJUSTMENT',
                  quantity: diff,
                  beforeQuantity: beforeQty,
                  afterQuantity: targetQuantity,
                  referenceType: 'manual_adjustment',
                  referenceId: productId,
                  createdBy: updatedBy,
                  notes: 'Updated via Edit Product detailed view',
                },
              });
            }
          } else {
            // Create stock
            await this.prisma.stock.create({
              data: {
                tenantId,
                productId,
                warehouseId: dto.warehouseId,
                branchId,
                quantity: targetQuantity,
                availableQuantity: targetQuantity,
              },
            });

            // Create stock movement
            await this.prisma.stockMovement.create({
              data: {
                tenantId,
                productId,
                warehouseId: dto.warehouseId,
                movementType: 'IN',
                quantity: targetQuantity,
                beforeQuantity: 0,
                afterQuantity: targetQuantity,
                referenceType: 'INITIAL_STOCK',
                referenceId: productId,
                createdBy: updatedBy,
                notes: 'Created via Edit Product detailed view',
              },
            });
          }
        }
      }

      return product;
    } catch (error) {
      console.error('Error in updateProduct:', error);
      throw error;
    }
  }

  async updateDiscountConfig(
    productId: string,
    dto: UpdateProductDiscountConfigDto,
    tenantId: string,
  ) {
    try {
      const product = await this.prisma.product.findUnique({
        where: { id: productId },
      });

      if (!product || product.tenantId !== tenantId) {
        throw new NotFoundException('Product not found');
      }

      const isEnabled =
        dto.isDiscountEnabled !== undefined
          ? dto.isDiscountEnabled
          : product.isDiscountEnabled;
      if (isEnabled) {
        const type =
          dto.discountType !== undefined
            ? dto.discountType
            : product.discountType;
        const maxVal =
          dto.maxAllowedDiscount !== undefined
            ? dto.maxAllowedDiscount
            : Number(product.maxAllowedDiscount ?? 0);
        const defaultVal =
          dto.defaultDiscountValue !== undefined
            ? dto.defaultDiscountValue
            : Number(product.defaultDiscountValue ?? 0);

        if (maxVal < 0) {
          throw new BadRequestException(
            'Maximum allowed discount cannot be negative',
          );
        }
        if (defaultVal < 0) {
          throw new BadRequestException(
            'Default discount value cannot be negative',
          );
        }
        if (type === 'PERCENTAGE') {
          if (maxVal > 100) {
            throw new BadRequestException(
              'Percentage discount cannot exceed 100%',
            );
          }
          if (defaultVal > 100) {
            throw new BadRequestException(
              'Default percentage discount cannot exceed 100%',
            );
          }
        }
        if (defaultVal > maxVal) {
          throw new BadRequestException(
            'Default discount cannot exceed maximum allowed discount',
          );
        }
      }

      return await this.prisma.product.update({
        where: { id: productId },
        data: {
          isDiscountEnabled: dto.isDiscountEnabled,
          discountType: dto.discountType,
          maxAllowedDiscount: dto.maxAllowedDiscount,
          defaultDiscountValue: dto.defaultDiscountValue,
          // Security measure: if they change the config, you might want to auto-revoke approval
          // isDiscountApproved: false,
        },
      });
    } catch (error) {
      console.error(
        `Error updating discount config for product ${productId}:`,
        error,
      );
      throw error;
    }
  }

  async approveDiscount(
    productId: string,
    dto: ApproveProductDiscountDto,
    tenantId: string,
  ) {
    try {
      const product = await this.prisma.product.findUnique({
        where: { id: productId },
      });

      if (!product || product.tenantId !== tenantId) {
        throw new NotFoundException('Product not found');
      }

      // We only update the approval toggle here
      return await this.prisma.product.update({
        where: { id: productId },
        data: {
          isDiscountApproved: dto.isDiscountApproved,
        },
      });
    } catch (error) {
      console.error(
        `Error approving discount for product ${productId}:`,
        error,
      );
      throw error;
    }
  }
}
