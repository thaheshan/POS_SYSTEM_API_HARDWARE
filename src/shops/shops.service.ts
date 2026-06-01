import { Injectable, InternalServerErrorException, Logger, NotFoundException } from '@nestjs/common';
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
    const supabaseKey = this.configService.get<string>('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl || !supabaseKey) {
      this.logger.warn('Supabase URL or Key is missing. Storage functionality may fail.');
    }

    this.storage = new StorageClient(
      `${supabaseUrl || ''}/storage/v1`,
      {
        apikey: supabaseKey || '',
        Authorization: `Bearer ${supabaseKey || ''}`,
      }
    );
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

      // Get public URL
      const { data: publicUrlData } = this.storage
        .from('shop-logos')
        .getPublicUrl(filePath);

      const logoUrl = publicUrlData.publicUrl;

      // Update shop with the new logo URL
      const updatedShop = await this.prisma.shop.update({
        where: { id: shopId },
        data: { logo_url: logoUrl },
        select: { id: true, logo_url: true, name: true }
      });

      return updatedShop;
    } catch (err) {
      this.logger.error('Error in uploadLogo', err);
      throw new InternalServerErrorException('An error occurred during upload');
    }
  }
}
