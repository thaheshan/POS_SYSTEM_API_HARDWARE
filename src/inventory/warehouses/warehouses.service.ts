import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateWarehouseDto } from './dto/create-warehouse.dto';
import { UpdateWarehouseDto } from './dto/update-warehouse.dto';

@Injectable()
export class WarehousesService {
  private readonly logger = new Logger(WarehousesService.name);

  constructor(private readonly prisma: PrismaService) {}

  // POST /warehouses
  async create(dto: CreateWarehouseDto) {
    // warehouse_code unique per tenant check
    const existing = await this.prisma.warehouse.findFirst({
      where: {
        warehouse_code: dto.warehouse_code,
        tenant_id: dto.tenant_id,
      },
    });
    if (existing) {
      throw new ConflictException('Warehouse code already exists for this tenant');
    }

    try {
      const warehouse = await this.prisma.warehouse.create({
        data: {
          ...dto,
          is_active: dto.is_active ?? true,
          is_default_for_pos: dto.is_default_for_pos ?? false,
        },
      });
      return warehouse;
    } catch (error) {
      this.logger.error('Failed to create warehouse', error);
      throw new InternalServerErrorException('Failed to create warehouse');
    }
  }

  // GET /warehouses
  async findAll() {
    return this.prisma.warehouse.findMany({
      orderBy: { created_at: 'desc' },
    });
  }

  // GET /warehouses/active
  async findActive() {
    return this.prisma.warehouse.findMany({
      where: { is_active: true },
      orderBy: { created_at: 'desc' },
    });
  }

  // GET /warehouses/:id
  async findOne(id: string) {
    const warehouse = await this.prisma.warehouse.findUnique({
      where: { id },
    });
    if (!warehouse) {
      throw new NotFoundException('Warehouse not found');
    }
    return warehouse;
  }

  // PATCH /warehouses/:id
  async update(id: string, dto: UpdateWarehouseDto) {
    await this.findOne(id);

    // warehouse_code duplicate check
    if (dto.warehouse_code) {
      const warehouse = await this.prisma.warehouse.findFirst({
        where: {
          warehouse_code: dto.warehouse_code,
          NOT: { id },
        },
      });
      if (warehouse) {
        throw new ConflictException('Warehouse code already exists');
      }
    }

    try {
      return await this.prisma.warehouse.update({
        where: { id },
        data: dto,
      });
    } catch (error) {
      this.logger.error('Failed to update warehouse', error);
      throw new InternalServerErrorException('Failed to update warehouse');
    }
  }
  // PATCH /warehouses/:id/status
async updateStatus(id: string, is_active: boolean) {
  const warehouse = await this.findOne(id);

  try {
    return await this.prisma.warehouse.update({
      where: { id },
      data: { is_active },
    });
  } catch (error) {
    this.logger.error('Failed to update warehouse status', error);
    throw new InternalServerErrorException('Failed to update status');
  }
}
}