import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateBrandDto } from './dto/create-brand.dto';
import { UpdateBrandDto } from './dto/update-brand.dto';
import {
  BrandAlreadyExistsException,
  BrandNotFoundException,
} from 'src/common/exceptions/brand.exceptions';

@Injectable()
export class BrandsService {
  constructor(private prisma: PrismaService) {}

  async create(tenant_id: string, createBrandDto: CreateBrandDto) {
    try {
      return await this.prisma.brand.create({
        data: {
          tenant_id,
          ...createBrandDto,
        },
      });
    } catch (error) {
      if (error.code === 'P2002') {
        throw new BrandAlreadyExistsException(
          'A brand with this name already exists.',
        );
      }
      throw error;
    }
  }

  async findAll(tenant_id: string) {
    return this.prisma.brand.findMany({
      where: { tenant_id },
      orderBy: { created_at: 'desc' },
    });
  }

  async update(tenant_id: string, id: string, updateBrandDto: UpdateBrandDto) {
    const brand = await this.prisma.brand.findFirst({
      where: { id, tenant_id },
    });

    if (!brand) {
      throw new BrandNotFoundException('Brand not found');
    }

    try {
      return await this.prisma.brand.update({
        where: { id, tenant_id },
        data: updateBrandDto,
      });
    } catch (error) {
      if (error.code === 'P2002') {
        throw new BrandAlreadyExistsException(
          'A brand with this name already exists.',
        );
      }
      throw error;
    }
  }

  async remove(tenant_id: string, id: string) {
    const brand = await this.prisma.brand.findFirst({
      where: { id, tenant_id },
    });

    if (!brand) {
      throw new BrandNotFoundException('Brand not found');
    }

    return this.prisma.brand.delete({
      where: { id, tenant_id },
    });
  }
}
