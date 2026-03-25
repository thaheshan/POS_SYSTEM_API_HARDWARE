import {
  ConflictException,
  Injectable,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateUnitDto } from './dto/create-unit.dto';
import { UpdateUnitDto } from './dto/update-unit.dto';

@Injectable()
export class UnitsService {
  private readonly logger = new Logger(UnitsService.name);
  constructor(private prisma: PrismaService) {}

  async create(tenant_id: string, createUnitDto: CreateUnitDto) {
    this.logger.log(
      `Creating unit '${createUnitDto.unitName}' for tenant ${tenant_id}`,
    );
    try {
      const unit = await this.prisma.unit.create({
        data: {
          tenantId: tenant_id,
          ...createUnitDto,
        },
      });
      this.logger.log(
        `Unit '${createUnitDto.unitName}' created with id ${unit.id}`,
      );
      return unit;
    } catch (error) {
      if (error.code === 'P2002') {
        this.logger.warn(
          `Unit already exists: ${createUnitDto.unitName} for tenant ${tenant_id}`,
        );
        throw new ConflictException(
          'A unit with this name or symbol already exists.',
        );
      }
      this.logger.error('Error creating unit', error);
      throw error;
    }
  }

  async findAll(tenant_id: string) {
    this.logger.log(`Fetching all units for tenant ${tenant_id}`);
    return this.prisma.unit.findMany({
      where: { tenantId: tenant_id },
      orderBy: { createdAt: 'desc' },
    });
  }

  async update(tenant_id: string, id: string, updateUnitDto: UpdateUnitDto) {
    this.logger.log(`Updating unit ${id} for tenant ${tenant_id}`);
    const unit = await this.prisma.unit.findUnique({
      where: { id },
    });

    if (!unit || unit.tenantId !== tenant_id) {
      this.logger.warn(`Unit ${id} not found for tenant ${tenant_id}`);
      throw new NotFoundException('Unit not found');
    }

    try {
      const updated = await this.prisma.unit.update({
        where: { id },
        data: updateUnitDto,
      });
      this.logger.log(`Unit ${id} updated for tenant ${tenant_id}`);
      return updated;
    } catch (error) {
      if (error.code === 'P2002') {
        this.logger.warn(
          `Unit already exists: ${updateUnitDto.unitName} for tenant ${tenant_id}`,
        );
        throw new ConflictException(
          'A unit with this name or symbol already exists.',
        );
      }
      this.logger.error('Error updating unit', error);
      throw error;
    }
  }

  async remove(tenant_id: string, id: string) {
    this.logger.log(`Deleting unit ${id} for tenant ${tenant_id}`);
    const unit = await this.prisma.unit.findUnique({
      where: { id },
    });

    if (!unit || unit.tenantId !== tenant_id) {
      this.logger.warn(`Unit ${id} not found for tenant ${tenant_id}`);
      throw new NotFoundException('Unit not found');
    }

    const deleted = await this.prisma.unit.delete({
      where: { id },
    });
    this.logger.log(`Unit ${id} deleted for tenant ${tenant_id}`);
    return deleted;
  }
}
