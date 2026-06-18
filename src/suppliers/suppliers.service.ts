import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class SuppliersService {
  private readonly logger = new Logger(SuppliersService.name);

  constructor(private prisma: PrismaService) {}

  async getSuppliers(tenantId: string, query: any) {
    this.logger.log(`Fetching suppliers for tenant: ${tenantId}`);
    
    const suppliers = await this.prisma.supplier.findMany({
      where: { tenantId },
      orderBy: { createdAt: 'desc' }
    });

    return {
      success: true,
      data: suppliers.map(s => ({
        id: s.id,
        supplierCode: s.supplierCode || 'N/A',
        name: s.name,
        contactPerson: s.contactPerson || 'N/A',
        email: s.email || 'N/A',
        phone: s.phone || 'N/A',
        location: s.location || 'Unknown',
        category: s.category || 'Other',
        status: s.isActive ? 'Active' : 'Inactive',
        createdAt: s.createdAt,
      }))
    };
  }

  async getStats(tenantId: string) {
    try {
      const totalSuppliers = await this.prisma.supplier.count({ where: { tenantId } });
      const activeSuppliers = await this.prisma.supplier.count({ where: { tenantId, isActive: true } });

      // Pending purchasing module - returning 0s
      return {
        success: true,
        data: {
          totalSuppliers,
          activeSuppliers,
          totalOutstandingPayable: 0,
          thisMonthPurchases: 0,
          overduePayments: 0,
        }
      };
    } catch (err) {
      this.logger.error('getStats failed', err);
      return {
        success: true,
        data: {
          totalSuppliers: 0,
          activeSuppliers: 0,
          totalOutstandingPayable: 0,
          thisMonthPurchases: 0,
          overduePayments: 0,
        }
      };
    }
  }

  async createSupplier(tenantId: string, body: any) {
    // Generate a simple code if not provided
    const count = await this.prisma.supplier.count({ where: { tenantId } });
    const code = body.supplierCode || `SUP-${1000 + count + 1}`;

    // Check if code already exists
    const existing = await this.prisma.supplier.findUnique({
      where: { supplierCode: code }
    });

    if (existing) {
      throw new BadRequestException(`Supplier code '${code}' is already in use.`);
    }

    const newSupplier = await this.prisma.supplier.create({
      data: {
        tenantId,
        name: body.name,
        supplierCode: code,
        contactPerson: body.contactPerson,
        email: body.email,
        phone: body.phone,
        location: body.location,
        category: body.category,
        isActive: body.status !== 'Inactive',
      }
    });

    return { success: true, data: newSupplier };
  }

  async updateSupplier(tenantId: string, id: string, body: any) {
    const updated = await this.prisma.supplier.update({
      where: { id, tenantId },
      data: {
        name: body.name,
        contactPerson: body.contactPerson,
        email: body.email,
        phone: body.phone,
        location: body.location,
        category: body.category,
        isActive: body.status !== 'Inactive',
      }
    });
    return { success: true, data: updated };
  }

  async deleteSupplier(tenantId: string, id: string) {
    await this.prisma.supplier.delete({
      where: { id, tenantId }
    });
    return { success: true };
  }

  // --- Supplier Requests & Inventory for Requests ---

  async getRequests(tenantId: string) {
    try {
      const requests = await this.prisma.supplierRequest.findMany({
        where: { tenantId },
        orderBy: { createdAt: 'desc' },
        include: { supplier: true }
      });

      return {
        success: true,
        data: requests.map(r => ({
          id: r.requestNo,
          status: r.status,
          supplier: r.supplier?.name || 'Unassigned',
          priority: r.priority,
          items: r.items,
          notes: r.notes,
          createdAt: r.createdAt
        }))
      };
    } catch (err) {
      this.logger.error('getRequests failed', err);
      return { success: true, data: [] };
    }
  }

  async getRequestStats(tenantId: string) {
    try {
      const [total, pending, completed] = await Promise.all([
        this.prisma.supplierRequest.count({ where: { tenantId } }).catch(e => { this.logger.error('count total failed', e); return 0; }),
        this.prisma.supplierRequest.count({ where: { tenantId, status: 'Pending' } }).catch(e => { this.logger.error('count pending failed', e); return 0; }),
        this.prisma.supplierRequest.count({ where: { tenantId, status: 'Completed' } }).catch(e => { this.logger.error('count completed failed', e); return 0; }),
      ]);

      const lowStockResult = await this.getLowStockAlerts(tenantId).catch(e => { this.logger.error('getLowStockAlerts failed', e); return { success: true, data: [] }; });

      return {
        success: true,
        data: {
          totalRequests: total,
          pendingRequests: pending,
          completedOrders: completed,
          lowStockItems: lowStockResult.data.length,
        }
      };
    } catch (err) {
      this.logger.error('getRequestStats failed', err);
      return { success: true, data: { totalRequests: 0, pendingRequests: 0, completedOrders: 0, lowStockItems: 0 } };
    }
  }

  async createRequest(tenantId: string, userId: string, body: any) {
    try {
      const count = await this.prisma.supplierRequest.count({ where: { tenantId } }).catch(() => 0);
      const requestNo = `REQ-${new Date().getFullYear()}-${String(count + 1).padStart(3, '0')}`;

      const newReq = await this.prisma.supplierRequest.create({
        data: {
          tenantId,
          requestNo,
          supplierId: body.supplierId || null,
          priority: body.priority || 'Normal',
          notes: body.notes || '',
          status: body.status || 'Draft',
          items: body.items || [],
          createdBy: userId,
        }
      });

      return { success: true, data: newReq };
    } catch (err) {
      this.logger.error('createRequest failed', err);
      throw err;
    }
  }

  async updateRequestStatus(tenantId: string, requestNo: string, status: string) {
    try {
      const req = await this.prisma.supplierRequest.findFirst({
        where: { tenantId, requestNo }
      });
      
      if (!req) {
        return { success: false, message: 'Request not found' };
      }

      const updated = await this.prisma.supplierRequest.update({
        where: { id: req.id },
        data: { status }
      });

      return { success: true, data: updated };
    } catch (err) {
      this.logger.error('updateRequestStatus failed', err);
      throw err;
    }
  }

  async getProductsForRequest(tenantId: string) {
    try {
      // Removing isActive: true temporarily to ensure we catch all products
      const products = await this.prisma.product.findMany({
        where: { tenantId },
        include: { stocks: true }
      });
      
      this.logger.log(`[getProductsForRequest] Found ${products.length} products for tenant ${tenantId}`);

      return {
        success: true,
        data: products.map(p => {
          const totalStock = p.stocks.reduce((sum, s) => sum + Number(s.quantity || 0), 0);
          return {
            id: p.id,
            name: p.name,
            sku: p.sku,
            stock: totalStock,
            minStock: Number(p.minimumStockLevel || 0)
          };
        })
      };
    } catch (err) {
      this.logger.error('getProductsForRequest failed', err);
      return { success: true, data: [] };
    }
  }

  async getLowStockAlerts(tenantId: string) {
    try {
      const productsRes = await this.getProductsForRequest(tenantId);
      const allProducts = productsRes.data;

      // Include items that are:
      // 1. Out of stock (0 units) — always needs reorder regardless of minStock setting
      // 2. Below or at minimum stock level (when minStock is configured)
      const lowStock = allProducts.filter(p =>
        p.stock === 0 || (p.minStock > 0 && p.stock <= p.minStock)
      );

      return {
        success: true,
        data: lowStock.map(p => {
          const isOutOfStock = p.stock === 0;
          // If no minStock set, suggest 10 as a safe default for out-of-stock items
          const suggestQty = p.minStock > 0 ? p.minStock * 2 : 10;
          return {
            id: p.id,
            product: p.name,
            current: p.stock,
            min: p.minStock,
            suggest: suggestQty,
            isYellow: !isOutOfStock && p.minStock > 0 && p.stock <= p.minStock, // Low but not zero
            isRed: isOutOfStock, // Out of stock = red
          };
        })
      };
    } catch (err) {
      this.logger.error('getLowStockAlerts failed', err);
      return { success: true, data: [] };
    }
  }
}


