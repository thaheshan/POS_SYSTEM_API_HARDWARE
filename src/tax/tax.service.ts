import { Injectable, NotFoundException, ConflictException, InternalServerErrorException, Logger, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class TaxService {
  private readonly logger = new Logger(TaxService.name);

  constructor(private readonly prisma: PrismaService) {}

  // POS-SET-05: Get Tax Configuration
  async getTaxConfig(shopId: string) {
    this.logger.log(`Retrieving tax config for shopId: ${shopId}`);

    const shop = await this.prisma.shop.findUnique({
      where: { id: shopId },
      select: {
        id: true,
        vatRate: true,
        tinNumber: true,
        vatNumber: true,
        isIrdCompliant: true,
        taxUpdatedAt: true,
      },
    });

    if (!shop) {
      throw new NotFoundException('Tax configuration not found');
    }

    return {
      vat_rate: shop.vatRate !== null ? Number(shop.vatRate) : 0,
      tin_number: shop.tinNumber ?? null,
      vat_number: shop.vatNumber ?? null,
      is_ird_compliant: shop.isIrdCompliant,
      last_updated: shop.taxUpdatedAt ?? null,
    };
  }

  // POS-SET-06: Update VAT Rate
  async updateVatRate(shopId: string, vatRate: number) {
    this.logger.log(`Updating VAT rate to ${vatRate} for shopId: ${shopId}`);

    if (vatRate < 0) {
      throw new BadRequestException('vat_rate must be a valid number');
    }

    const shop = await this.prisma.shop.findUnique({ where: { id: shopId } });
    if (!shop) {
      throw new NotFoundException('Shop not found');
    }

    try {
      const updated = await this.prisma.shop.update({
        where: { id: shopId },
        data: {
          vatRate: vatRate,
          taxUpdatedAt: new Date(),
        },
        select: { vatRate: true, taxUpdatedAt: true },
      });

      return {
        message: 'VAT rate updated successfully',
        vat_rate: Number(updated.vatRate),
        updated_at: updated.taxUpdatedAt,
      };
    } catch (error) {
      this.logger.error(`Failed to update VAT rate for shopId: ${shopId}`, error);
      throw new InternalServerErrorException('Failed to update VAT rate');
    }
  }

  // POS-SET-07: Update TIN Number
  async updateTinNumber(shopId: string, tinNumber: string) {
    this.logger.log(`Updating TIN number for shopId: ${shopId}`);

    const shop = await this.prisma.shop.findUnique({ where: { id: shopId } });
    if (!shop) {
      throw new NotFoundException('Shop not found');
    }

    // Check uniqueness across other shops
    const existing = await this.prisma.shop.findFirst({
      where: {
        tinNumber: tinNumber,
        id: { not: shopId },
      },
    });
    if (existing) {
      throw new ConflictException('TIN number already exists');
    }

    try {
      const updated = await this.prisma.shop.update({
        where: { id: shopId },
        data: {
          tinNumber: tinNumber,
          taxUpdatedAt: new Date(),
        },
        select: { tinNumber: true, taxUpdatedAt: true },
      });

      return {
        message: 'TIN number updated successfully',
        tin_number: updated.tinNumber,
        updated_at: updated.taxUpdatedAt,
      };
    } catch (error) {
      this.logger.error(`Failed to update TIN number for shopId: ${shopId}`, error);
      throw new InternalServerErrorException('Failed to update TIN number');
    }
  }

  // POS-SET-08: Update VAT Number
  async updateVatNumber(shopId: string, vatNumber: string) {
    this.logger.log(`Updating VAT number for shopId: ${shopId}`);

    const shop = await this.prisma.shop.findUnique({ where: { id: shopId } });
    if (!shop) {
      throw new NotFoundException('Shop not found');
    }

    // Check uniqueness across other shops
    const existing = await this.prisma.shop.findFirst({
      where: {
        vatNumber: vatNumber,
        id: { not: shopId },
      },
    });
    if (existing) {
      throw new ConflictException('VAT number already exists');
    }

    try {
      const updated = await this.prisma.shop.update({
        where: { id: shopId },
        data: {
          vatNumber: vatNumber,
          taxUpdatedAt: new Date(),
        },
        select: { vatNumber: true, taxUpdatedAt: true },
      });

      return {
        message: 'VAT number updated successfully',
        vat_number: updated.vatNumber,
        updated_at: updated.taxUpdatedAt,
      };
    } catch (error) {
      this.logger.error(`Failed to update VAT number for shopId: ${shopId}`, error);
      throw new InternalServerErrorException('Failed to update VAT number');
    }
  }
}
