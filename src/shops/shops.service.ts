import {
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ConfigService } from '@nestjs/config';
import { StorageClient } from '@supabase/storage-js';
import * as crypto from 'crypto';

@Injectable()
export class ShopsService {
  private readonly logger = new Logger(ShopsService.name);
  private storage: StorageClient;

  constructor(
    private prisma: PrismaService,
    private configService: ConfigService,
  ) {
    const supabaseUrl = this.configService.get<string>('SUPABASE_URL');
    const supabaseKey = this.configService.get<string>(
      'SUPABASE_SERVICE_ROLE_KEY',
    );

    if (!supabaseUrl || !supabaseKey) {
      this.logger.warn(
        'Supabase URL or Key is missing. Storage functionality may fail.',
      );
    }

    this.storage = new StorageClient(`${supabaseUrl || ''}/storage/v1`, {
      apikey: supabaseKey || '',
      Authorization: `Bearer ${supabaseKey || ''}`,
    });
  }

  async uploadLogo(shopId: string, file: any) {
    const shop = await this.prisma.shop.findUnique({ where: { id: shopId } });
    if (!shop) {
      throw new NotFoundException('Shop not found');
    }

    // Generate a unique file name
    const fileExtension = file.originalname.split('.').pop() || 'png';
    const uniqueFileName = `${shopId}-${Date.now()}-${crypto.randomBytes(4).toString('hex')}.${fileExtension}`;
    const filePath = `logos/${uniqueFileName}`;

    try {
      const { data, error } = await this.storage
        .from('shop-logos')
        .upload(filePath, file.buffer, {
          contentType: file.mimetype,
          upsert: true,
        });

      if (error) {
        this.logger.error('Failed to upload to Supabase', error);
        throw new InternalServerErrorException('Failed to upload logo');
      }

      const { data: publicUrlData } = this.storage
        .from('shop-logos')
        .getPublicUrl(filePath);

      const logoUrl = publicUrlData.publicUrl;

      const updatedShop = await this.prisma.shop.update({
        where: { id: shopId },
        data: { logo_url: logoUrl },
        select: { id: true, logo_url: true, name: true },
      });

      return updatedShop;
    } catch (err) {
      this.logger.error('Error in uploadLogo', err);
      throw new InternalServerErrorException('An error occurred during upload');
    }
  }

  async getActiveShops() {
    try {
      return await this.prisma.shop.findMany({
        where: {
          subscriptionStatus: 'ACTIVE',
        },
        select: {
          id: true,
          name: true,
        },
      });
    } catch (error) {
      this.logger.error('Failed to fetch active shops', error);
      throw new InternalServerErrorException('Could not fetch shops');
    }
  }

  async verifyShopAssociation(shopId: string, privateId: string) {
    const expectedCode = shopId.substring(0, 8).toLowerCase();
    const providedCode = privateId.trim().toLowerCase();

    if (expectedCode !== providedCode) {
      return { success: false, message: 'Invalid Shop Private ID' };
    }

    const shop = await this.prisma.shop.findUnique({
      where: { id: shopId },
      select: { subscriptionStatus: true },
    });

    if (!shop) {
      throw new NotFoundException('Shop not found');
    }

    if (shop.subscriptionStatus !== 'ACTIVE') {
      return {
        success: false,
        message:
          'Registration failed. This shop does not have an active subscription.',
      };
    }
    return { success: true, message: 'Shop verified successfully' };
  }
}
