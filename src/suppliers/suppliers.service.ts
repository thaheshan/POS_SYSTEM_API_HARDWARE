import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class SuppliersService {
  private readonly logger = new Logger(SuppliersService.name);

  constructor(private prisma: PrismaService) {}

  async getSuppliers(tenantId: string, query: any) {
    this.logger.log(`Fetching suppliers for tenant: ${tenantId}`);
    
    // Note: We can implement dynamic filtering using 'query' if needed.
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
        location: 'Unknown', // The DB schema doesn't have location, so providing a default.
        status: s.isActive ? 'Active' : 'Inactive',
        createdAt: s.createdAt,
      }))
    };
  }
}
