import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateWarehouseDto, UpdateWarehouseDto } from './dto/warehouse.dto';

@Injectable()
export class WarehousesService {
  private readonly logger = new Logger(WarehousesService.name);

  constructor(private prisma: PrismaService) {}

  async create(tenantId: string, createWarehouseDto: CreateWarehouseDto) {
    // A warehouse must belong to a branch. If none provided, use the first branch found for the tenant.
    let branchId = createWarehouseDto.branchId;
    
    if (!branchId) {
      const branch = await this.prisma.branch.findFirst({
        where: { tenantId }
      });
      if (!branch) {
        throw new BadRequestException('No branch found for this tenant to attach the warehouse to. Create a branch first.');
      }
      branchId = branch.id;
    }

    return this.prisma.warehouse.create({
      data: {
        tenantId,
        branchId,
        name: createWarehouseDto.name,
        code: createWarehouseDto.code,
        address: createWarehouseDto.address,
        capacity: createWarehouseDto.capacity,
      },
    });
  }

  async findAll(tenantId: string) {
    return this.prisma.warehouse.findMany({
      where: { tenantId },
      include: {
        _count: {
          select: { stocks: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    });
  }

  async findOne(tenantId: string, id: string) {
    const warehouse = await this.prisma.warehouse.findFirst({
      where: { id, tenantId },
      include: {
        _count: {
          select: { stocks: true }
        }
      }
    });

    if (!warehouse) {
      throw new NotFoundException('Warehouse not found');
    }

    return warehouse;
  }

  async update(tenantId: string, id: string, updateWarehouseDto: UpdateWarehouseDto) {
    const warehouse = await this.prisma.warehouse.findFirst({
      where: { id, tenantId },
    });

    if (!warehouse) {
      throw new NotFoundException('Warehouse not found');
    }

    return this.prisma.warehouse.update({
      where: { id },
      data: {
        ...updateWarehouseDto
      },
    });
  }

  async remove(tenantId: string, id: string) {
    const warehouse = await this.prisma.warehouse.findFirst({
      where: { id, tenantId },
      include: {
        stocks: true
      }
    });

    if (!warehouse) {
      throw new NotFoundException('Warehouse not found');
    }

    // Check if there is any stock in this warehouse
    const hasStock = warehouse.stocks.some(stock => Number(stock.availableQuantity) > 0 || Number(stock.quantity) > 0);

    if (hasStock) {
      throw new BadRequestException('Cannot delete warehouse. It currently has stock remaining. Please transfer or remove all stock first.');
    }

    return this.prisma.warehouse.delete({
      where: { id },
    });
  }
}
