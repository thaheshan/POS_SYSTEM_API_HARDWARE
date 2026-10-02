import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class SuppliersService {
  constructor(private prisma: PrismaService) {}

  async getSuppliers(tenantId: string) {
    return this.prisma.supplier.findMany({
      where: { tenantId },
      orderBy: { name: 'asc' },
    });
  }

  async getSupplierStats(tenantId: string) {
    const totalSuppliers = await this.prisma.supplier.count({
      where: { tenantId },
    });
    const activeSuppliers = await this.prisma.supplier.count({
      where: { tenantId, isActive: true },
    });
    return {
      success: true,
      data: {
        totalSuppliers,
        activeSuppliers,
      },
    };
  }

  async getSupplierById(id: string, tenantId: string) {
    // Validate UUID format to prevent 500 error when non-UUID paths are routed here
    const isUuid = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(id);
    if (!isUuid) {
      throw new NotFoundException('Supplier not found');
    }

    const supplier = await this.prisma.supplier.findFirst({
      where: { id, tenantId },
    });
    if (!supplier) throw new NotFoundException('Supplier not found');
    return supplier;
  }
}
