import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateBrandDto } from './dto/create-brand.dto';
import { UpdateBrandDto } from './dto/update-brand.dto';
import {
  BrandAlreadyExistsException,
  BrandNotFoundException,
} from 'src/common/exceptions/brand.exceptions';

@Injectable()
export class BrandsService {
  private readonly logger = new Logger(BrandsService.name);
  constructor(private prisma: PrismaService) {}

  async create(tenant_id: string, createBrandDto: CreateBrandDto) {
    this.logger.log(
      `Creating brand '${createBrandDto.brandName}' for tenant ${tenant_id}`,
    );
    try {
      const brand = await this.prisma.brand.create({
        data: {
          tenantId: tenant_id,
          ...createBrandDto,
        },
      });
      this.logger.log(
        `Brand '${createBrandDto.brandName}' created with id ${brand.id}`,
      );
      return brand;
    } catch (error) {
      if (error.code === 'P2002') {
        this.logger.warn(
          `Brand already exists: ${createBrandDto.brandName} for tenant ${tenant_id}`,
        );
        throw new BrandAlreadyExistsException(
          'A brand with this name already exists.',
        );
      }
      this.logger.error('Error creating brand', error);
      throw error;
    }
  }

  async findAll(tenant_id: string) {
    this.logger.log(`Fetching all brands for tenant ${tenant_id}`);
    return this.prisma.brand.findMany({
      where: { tenantId: tenant_id },
      orderBy: { createdAt: 'desc' },
    });
  }

  async update(tenant_id: string, id: string, updateBrandDto: UpdateBrandDto) {
    this.logger.log(`Updating brand ${id} for tenant ${tenant_id}`);
    const brand = await this.prisma.brand.findFirst({
      where: { id, tenantId: tenant_id },
    });

    if (!brand) {
      this.logger.warn(`Brand ${id} not found for tenant ${tenant_id}`);
      throw new BrandNotFoundException('Brand not found');
    }

    try {
      const updated = await this.prisma.brand.update({
        where: { id, tenantId: tenant_id },
        data: updateBrandDto,
      });
      this.logger.log(`Brand ${id} updated for tenant ${tenant_id}`);
      return updated;
    } catch (error) {
      if (error.code === 'P2002') {
        this.logger.warn(
          `Brand already exists: ${updateBrandDto.brandName} for tenant ${tenant_id}`,
        );
        throw new BrandAlreadyExistsException(
          'A brand with this name already exists.',
        );
      }
      this.logger.error('Error updating brand', error);
      throw error;
    }
  }

  async remove(tenant_id: string, id: string) {
    this.logger.log(`Deleting brand ${id} for tenant ${tenant_id}`);
    const brand = await this.prisma.brand.findFirst({
      where: { id, tenantId: tenant_id },
    });

    if (!brand) {
      this.logger.warn(`Brand ${id} not found for tenant ${tenant_id}`);
      throw new BrandNotFoundException('Brand not found');
    }

    const deleted = await this.prisma.brand.delete({
      where: { id, tenantId: tenant_id },
    });
    this.logger.log(`Brand ${id} deleted for tenant ${tenant_id}`);
    return deleted;
  }
}
