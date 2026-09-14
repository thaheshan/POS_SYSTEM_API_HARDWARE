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

      // 2. Validate SKU uniqueness & auto-advance if colliding HKU_ auto-generated SKU
      let finalSku = dto.sku;
      let existingSku = await this.prisma.product.findUnique({
        where: { tenantId_sku: { tenantId, sku: finalSku } },
      });

      if (existingSku) {
        if (finalSku && finalSku.toUpperCase().startsWith('HKU_')) {
          const allProducts = await this.prisma.product.findMany({
            where: { tenantId },
            select: { sku: true },
          });
          let maxNum = 0;
          allProducts.forEach((p) => {
            if (p.sku) {
              const m = p.sku.match(/HKU_(\d+)/i);
              if (m) {
                const n = parseInt(m[1], 10);
                if (n > maxNum) maxNum = n;
              }
            }
          });
          finalSku = `HKU_${maxNum + 1}`;
          console.log(`[createProduct] SKU collision resolved: Auto-advanced SKU from ${dto.sku} to ${finalSku}`);
        } else {
          throw new BadRequestException('Product with this SKU already exists');
        }
      }

      // 3. Create the product
      const product = await this.prisma.product.create({
        data: {
          tenantId,
          name: dto.name,
          sku: finalSku,
          description: dto.description,
          categoryId: categoryId,
          subcategoryId: dto.subcategoryId || undefined,
          brandId: dto.brandId,
          unitId: dto.unitId,
          purchasePrice: purchasePrice,
          sellingPrice: sellingPrice,
          minimumSellingPrice: (dto as any).minimumSellingPrice ? Number((dto as any).minimumSellingPrice) : (dto as any).comparePrice ? Number((dto as any).comparePrice) : undefined,
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

      // Link supplier if provided
      const createSupplierId = (dto as any).supplierId ?? (dto as any).supplier_id;
      if (createSupplierId && String(createSupplierId).trim() !== '') {
        try {
          await this.prisma.supplierProduct.create({
            data: {
              supplierId: String(createSupplierId).trim(),
              productId: product.id,
            },
          });
        } catch (sErr) {
          console.error('Failed to link supplier product on creation:', sErr);
        }
      }

      return product;
    } catch (error) {
      console.error('Error in createProduct:', error);
      throw error;
    }
  }

  async getNextSku(tenantId: string) {
    const products = await this.prisma.product.findMany({
      where: { tenantId },
      select: { sku: true, barcode: true },
    });

    let maxSkuNum = 0;
    const skuPattern = /^(?:HKU|SKU)_(\d+)$/i;

    products.forEach((p) => {
      if (p.sku && typeof p.sku === 'string') {
        const match = p.sku.trim().match(skuPattern);
        if (match) {
          const num = parseInt(match[1], 10);
          if (num > maxSkuNum) {
            maxSkuNum = num;
          }
        }
      }
    });

    let maxBarcodeNum = 0;
    const barcodePattern = /^200000(\d{6})$/;

    products.forEach((p) => {
      if (p.barcode && typeof p.barcode === 'string') {
        const match = p.barcode.trim().match(barcodePattern);
        if (match) {
          const num = parseInt(match[1], 10);
          if (num > maxBarcodeNum) {
            maxBarcodeNum = num;
          }
        }
      }
    });

    const nextSkuNum = maxSkuNum + 1;
    const nextBarcodeNum = maxBarcodeNum + 1;

    return {
      nextSku: `HKU_${nextSkuNum}`,
      nextBarcode: `200000${String(nextBarcodeNum).padStart(6, '0')}`,
    };
  }

  async getProducts(tenantId: string) {
    return this.prisma.product.findMany({
      where: { tenantId, isActive: true },
      include: {
        category: true,
        subCategory: true,
        brand: true,
        unit: true,
        images: true,
        supplierProducts: {
          include: {
            supplier: true,
          },
        },
      },
    });
  }

  async getCategories(tenantId: string) {
    return this.prisma.category.findMany({
      where: { tenantId, isActive: true, parentId: null }, // only top-level
      orderBy: { name: 'asc' },
      include: {
        brands: {
          where: { isActive: true },
          orderBy: { name: 'asc' },
        },
        subcategories: {
          where: { isActive: true },
          orderBy: { name: 'asc' },
          include: {
            brands: {
              where: { isActive: true },
              orderBy: { name: 'asc' },
            },
          },
        },
      },
    });
  }

  async getSubcategories(tenantId: string, parentId: string) {
    return this.prisma.category.findMany({
      where: { tenantId, parentId, isActive: true },
      orderBy: { name: 'asc' },
      include: {
        brands: {
          where: { isActive: true },
          orderBy: { name: 'asc' },
        },
      },
    });
  }

  async createCategory(tenantId: string, name: string, description?: string) {
    return this.prisma.category.create({
      data: { tenantId, name, description },
    });
  }

  async createSubcategory(tenantId: string, parentId: string, name: string, description?: string) {
    // verify parent exists and belongs to this tenant
    const parent = await this.prisma.category.findFirst({
      where: { id: parentId, tenantId },
    });
    if (!parent) throw new NotFoundException('Parent category not found');
    return this.prisma.category.create({
      data: { tenantId, parentId, name, description },
    });
  }

  async updateCategory(tenantId: string, categoryId: string, name?: string, description?: string) {
    const cat = await this.prisma.category.findFirst({ where: { id: categoryId, tenantId } });
    if (!cat) throw new NotFoundException('Category not found');
    return this.prisma.category.update({
      where: { id: categoryId },
      data: {
        ...(name !== undefined && { name }),
        ...(description !== undefined && { description }),
      },
    });
  }

  async deleteCategory(tenantId: string, categoryId: string) {
    const cat = await this.prisma.category.findFirst({ where: { id: categoryId, tenantId } });
    if (!cat) throw new NotFoundException('Category not found');
    return this.prisma.category.update({
      where: { id: categoryId },
      data: { isActive: false },
    });
  }

  /* ─── Brand Endpoints ─── */
  async getBrands(tenantId: string, subcategoryId?: string) {
    return this.prisma.brand.findMany({
      where: {
        tenantId,
        isActive: true,
        ...(subcategoryId ? { categoryId: subcategoryId } : {}),
      },
      orderBy: { name: 'asc' },
    });
  }

  async createBrand(tenantId: string, name: string, categoryId?: string, description?: string) {
    return this.prisma.brand.create({
      data: { tenantId, name, categoryId, description },
    });
  }

  async updateBrand(tenantId: string, brandId: string, name?: string, description?: string) {
    const brand = await this.prisma.brand.findFirst({ where: { id: brandId, tenantId } });
    if (!brand) throw new NotFoundException('Brand not found');
    return this.prisma.brand.update({
      where: { id: brandId },
      data: {
        ...(name !== undefined && { name }),
        ...(description !== undefined && { description }),
      },
    });
  }

  async deleteBrand(tenantId: string, brandId: string) {
    const brand = await this.prisma.brand.findFirst({ where: { id: brandId, tenantId } });
    if (!brand) throw new NotFoundException('Brand not found');
    return this.prisma.brand.update({
      where: { id: brandId },
      data: { isActive: false },
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

    // Soft-delete strategy: mark the product inactive and append timestamp suffix to free SKU
    const freedSku = `${product.sku}_DELETED_${Date.now()}`;

    await this.prisma.$transaction([
      // Remove inventory records that are safe to purge
      this.prisma.supplierProduct.deleteMany({ where: { productId } }),
      this.prisma.stockMovement.deleteMany({ where: { productId } }),
      this.prisma.stock.deleteMany({ where: { productId } }),
      this.prisma.productImage.deleteMany({ where: { productId } }),
      // Soft-delete the product itself and release its SKU
      this.prisma.product.update({
        where: { id: productId },
        data: { isActive: false, sku: freedSku },
      }),
    ]);

    return { success: true, message: 'Product deleted successfully' };
  }

  async updateProduct(
    productId: string,
    dto: any,
    tenantId: string,
    updatedBy: string,
    imageFile?: any,
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

      // Safe UUID helper (returns undefined if val is undefined, returns null for non-UUID strings to avoid PostgreSQL UUID syntax errors)
      const parseUuid = (val: any) => {
        if (val === undefined) return undefined;
        if (val && typeof val === 'string') {
          const trimmed = val.trim();
          const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
          if (uuidRegex.test(trimmed)) {
            return trimmed;
          }
        }
        return null;
      };

      // If SKU is being changed, check if new SKU is already in use by another product
      if (dto.sku && String(dto.sku).trim() !== String(existingProduct.sku || '').trim()) {
        const targetSku = String(dto.sku).trim();
        const existingSku = await this.prisma.product.findFirst({
          where: { tenantId, sku: targetSku, NOT: { id: productId } },
        });
        if (existingSku) {
          throw new BadRequestException('Product with this SKU already exists');
        }
      }

      // If categoryId is provided, verify it exists using parseUuid
      const targetCatId = parseUuid(dto.categoryId);
      if (targetCatId) {
        const category = await this.prisma.category.findUnique({
          where: { id: targetCatId },
        });
        if (!category || category.tenantId !== tenantId) {
          throw new NotFoundException('Category not found');
        }
      }

      // Safe boolean helper
      const parseBool = (val: any) => {
        if (val === undefined || val === null || val === 'undefined' || val === 'null') return undefined;
        if (typeof val === 'boolean') return val;
        if (typeof val === 'string') return val.toLowerCase() === 'true' || val === '1';
        if (typeof val === 'number') return val === 1;
        return Boolean(val);
      };

      // Safe number helper
      const parseNum = (val: any) =>
        val !== undefined && val !== null && val !== '' && val !== 'undefined' && val !== 'null' && !isNaN(Number(val))
          ? Number(val)
          : undefined;

      // Safe Enum helper
      const parseDiscountType = (val: any) => {
        if (val === undefined) return undefined;
        if (!val || val === 'null' || val === 'undefined') return undefined;
        const str = String(val).toUpperCase();
        if (str === 'PERCENTAGE' || str === 'PERCENT') return 'PERCENTAGE';
        if (str === 'FIXED_AMOUNT' || str === 'FIXED' || str === 'FIXED_VALUE') return 'FIXED_AMOUNT';
        return undefined;
      };

      // Update product core fields safely
      const product = await this.prisma.product.update({
        where: { id: productId },
        data: {
          name: dto.name !== undefined ? String(dto.name).trim() : undefined,
          sku: dto.sku !== undefined ? String(dto.sku).trim() : undefined,
          barcode:
            dto.barcode !== undefined && dto.barcode !== null
              ? String(dto.barcode).trim() !== '' && dto.barcode !== 'undefined' && dto.barcode !== 'null'
                ? String(dto.barcode).trim()
                : null
              : undefined,
          description: dto.description !== undefined ? String(dto.description).trim() : undefined,
          categoryId: parseUuid(dto.categoryId) || undefined,
          subcategoryId: parseUuid(dto.subcategoryId ?? dto.subCategoryId),
          brandId: parseUuid(dto.brandId),
          unitId: parseUuid(dto.unitId),
          sellType: dto.sellType || dto.productType || undefined,
          measurementUnit:
            dto.measurementUnit !== undefined && dto.measurementUnit !== 'undefined' && dto.measurementUnit !== 'null'
              ? dto.measurementUnit
              : undefined,
          purchasePrice: parseNum(dto.purchasePrice ?? dto.costPrice),
          sellingPrice: parseNum(dto.sellingPrice ?? dto.unitCost),
          minimumSellingPrice: parseNum(dto.minimumSellingPrice ?? dto.comparePrice ?? dto.compareAtPrice),
          taxRate: parseNum(dto.taxRate),
          minimumStockLevel: parseNum(dto.minimumStockLevel ?? dto.minLevel),
          maximumStockLevel: parseNum(dto.maximumStockLevel ?? dto.maxLevel),
          maxAllowedDiscount: parseNum(dto.maxAllowedDiscount),
          defaultDiscountValue: parseNum(dto.defaultDiscountValue),
          discountType: parseDiscountType(dto.discountType),
          isActive:
            dto.status !== undefined
              ? String(dto.status).toUpperCase() === 'ACTIVE'
              : parseBool(dto.isActive),
          isDiscountEnabled: parseBool(dto.isDiscountEnabled),
          isDiscountApproved: parseBool(dto.isDiscountApproved),
          hasSecondaryDiscount: parseBool(dto.hasSecondaryDiscount),
          secondaryDiscountType: parseDiscountType(dto.secondaryDiscountType),
          maxSecondaryDiscount: parseNum(dto.maxSecondaryDiscount),
          defaultSecondaryDiscount: parseNum(dto.defaultSecondaryDiscount),
        },
      });

      // Handle Image File upload or image URL / Base64 string update
      let uploadedImageUrl: string | null = null;
      if (imageFile && this.storage) {
        try {
          const fileExt = imageFile.originalname ? imageFile.originalname.split('.').pop() : 'jpg';
          const fileName = `${tenantId}/${product.id}_${Date.now()}.${fileExt}`;
          const { data, error } = await this.storage
            .from('product-images')
            .upload(fileName, imageFile.buffer, {
              contentType: imageFile.mimetype || 'image/jpeg',
              upsert: true,
            });

          if (!error) {
            const { data: publicUrlData } = this.storage
              .from('product-images')
              .getPublicUrl(fileName);
            if (publicUrlData && publicUrlData.publicUrl) {
              uploadedImageUrl = publicUrlData.publicUrl;
            }
          }
        } catch (uploadError) {
          console.error('Exception during image upload in updateProduct:', uploadError);
        }
      } else if (dto.image || dto.imageUrl || dto.image_url) {
        uploadedImageUrl = dto.image || dto.imageUrl || dto.image_url;
      }

      if (uploadedImageUrl) {
        try {
          await this.prisma.productImage.updateMany({
            where: { productId },
            data: { isPrimary: false },
          });
          await this.prisma.productImage.create({
            data: {
              productId,
              imageUrl: uploadedImageUrl,
              isPrimary: true,
            },
          });
        } catch (imgErr) {
          console.error('Failed to link updated image to product in DB:', imgErr);
        }
      }

      // Update supplier association if supplierId was passed in DTO
      if (dto.supplierId !== undefined || dto.supplier_id !== undefined) {
        const targetSupplierId = parseUuid(dto.supplierId ?? dto.supplier_id);
        await this.prisma.supplierProduct.deleteMany({
          where: { productId },
        });
        if (targetSupplierId) {
          await this.prisma.supplierProduct.create({
            data: {
              supplierId: targetSupplierId,
              productId,
            },
          });
        }
      }

      // Update stock quantity if provided
      if (dto.qty !== undefined && dto.qty !== null && dto.qty !== '' && dto.qty !== 'undefined' && dto.qty !== 'null') {
        const targetQuantity = Number(dto.qty);
        let targetWarehouseId = parseUuid(dto.warehouseId);

        // If warehouseId wasn't passed, find existing stock record or default warehouse
        if (!targetWarehouseId) {
          const existingStock = await this.prisma.stock.findFirst({
            where: { productId, tenantId },
          });
          if (existingStock) {
            targetWarehouseId = existingStock.warehouseId;
          } else {
            const firstWh = await this.prisma.warehouse.findFirst({
              where: { tenantId },
            });
            if (firstWh) targetWarehouseId = firstWh.id;
          }
        }

        if (targetWarehouseId) {
          const existingStock = await this.prisma.stock.findFirst({
            where: { productId, warehouseId: targetWarehouseId, tenantId },
          });

          const warehouse = await this.prisma.warehouse.findUnique({
            where: { id: targetWarehouseId },
          });
          const branchId = warehouse?.branchId;

          if (existingStock) {
            const beforeQty = Number(existingStock.quantity);
            const diff = targetQuantity - beforeQty;

            if (diff !== 0) {
              await this.prisma.stock.update({
                where: { id: existingStock.id },
                data: {
                  quantity: targetQuantity,
                  availableQuantity: Math.max(
                    0,
                    targetQuantity - Number(existingStock.reservedQuantity || 0),
                  ),
                },
              });

              await this.prisma.stockMovement.create({
                data: {
                  tenantId,
                  productId,
                  warehouseId: targetWarehouseId,
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
          } else if (branchId) {
            await this.prisma.stock.create({
              data: {
                tenantId,
                productId,
                warehouseId: targetWarehouseId,
                branchId,
                quantity: targetQuantity,
                availableQuantity: targetQuantity,
              },
            });

            await this.prisma.stockMovement.create({
              data: {
                tenantId,
                productId,
                warehouseId: targetWarehouseId,
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
    } catch (error: any) {
      console.error('Error in updateProduct:', error);
      if (error instanceof BadRequestException || error instanceof NotFoundException) {
        throw error;
      }
      throw new BadRequestException(
        error?.message || 'Failed to update product details. Check inputs.',
      );
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
          hasSecondaryDiscount: dto.hasSecondaryDiscount,
          secondaryDiscountType: dto.secondaryDiscountType,
          maxSecondaryDiscount: dto.maxSecondaryDiscount,
          defaultSecondaryDiscount: dto.defaultSecondaryDiscount,
        } as any,
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
