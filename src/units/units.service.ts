import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateUnitDto } from './dto/create-unit.dto';
import { UpdateUnitDto } from './dto/update-unit.dto';

@Injectable()
export class UnitsService {
  constructor(private prisma: PrismaService) {}

  async create(tenant_id: string, createUnitDto: CreateUnitDto) {
    try {
      return await this.prisma.unit.create({
        data: {
          tenant_id,
          ...createUnitDto,
        },
      });
    } catch (error) {
      if (error.code === 'P2002') {
        throw new ConflictException(
          'A unit with this name or symbol already exists.',
        );
      }
      throw error;
    }
  }

  async findAll(tenant_id: string) {
    return this.prisma.unit.findMany({
      where: { tenant_id },
      orderBy: { created_at: 'desc' },
    });
  }

  async update(tenant_id: string, id: string, updateUnitDto: UpdateUnitDto) {
    const unit = await this.prisma.unit.findUnique({
      where: { id },
    });

    if (!unit || unit.tenant_id !== tenant_id) {
      throw new NotFoundException('Unit not found');
    }

    try {
      return await this.prisma.unit.update({
        where: { id },
        data: updateUnitDto,
      });
    } catch (error) {
      if (error.code === 'P2002') {
        throw new ConflictException(
          'A unit with this name or symbol already exists.',
        );
      }
      throw error;
    }
  }

  async remove(tenant_id: string, id: string) {
    const unit = await this.prisma.unit.findUnique({
      where: { id },
    });

    if (!unit || unit.tenant_id !== tenant_id) {
      throw new NotFoundException('Unit not found');
    }

    return this.prisma.unit.delete({
      where: { id },
    });
  }
}
