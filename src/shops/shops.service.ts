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

  async getProfile(shopId: string) {
    const shop = await this.prisma.shop.findUnique({
      where: { id: shopId },
      select: {
        id: true,
        name: true,
        businessRegistration: true,
        email: true,
        phone: true,
        logo_url: true,
        address: true,
        city: true,
        district: true,
        province: true,
        subscriptionPlan: true,
        subscriptionStatus: true,
        nextPaymentDue: true,
      },
    });
    if (!shop) throw new NotFoundException('Shop not found');
    return shop;
  }

  async updateProfile(shopId: string, data: {
    name?: string;
    businessRegistration?: string;
    email?: string;
    phone?: string;
    address?: string;
    city?: string;
    district?: string;
    province?: string;
  }) {
    return this.prisma.shop.update({
      where: { id: shopId },
      data,
      select: {
        id: true,
        name: true,
        businessRegistration: true,
        email: true,
        phone: true,
        logo_url: true,
        address: true,
        city: true,
        district: true,
        province: true,
      },
    });
  }

  async getShopSettings(shopId: string) {
    const flags = await this.prisma.featureFlag.findMany({
      where: { tenant_id: shopId },
    });
    const result: Record<string, any> = {};
    for (const flag of flags) {
      // If it's a known string field or has a value, return value, else return boolean
      if (flag.value !== null) {
        result[flag.feature_key] = flag.value;
      } else {
        result[flag.feature_key] = flag.enabled;
      }
    }
    return result;
  }

  async upsertSetting(shopId: string, key: string, val: boolean | string) {
    const isBool = typeof val === 'boolean';
    return this.prisma.featureFlag.upsert({
      where: { tenant_id_feature_key: { tenant_id: shopId, feature_key: key } },
      update: isBool ? { enabled: val } : { value: String(val) },
      create: isBool 
        ? { tenant_id: shopId, feature_key: key, enabled: val }
        : { tenant_id: shopId, feature_key: key, enabled: true, value: String(val) },
    });
  }

  async updateShopSettings(shopId: string, settings: Record<string, any>) {
    const results: any[] = [];
    for (const [key, val] of Object.entries(settings)) {
      const r = await this.upsertSetting(shopId, key, val);
      results.push(r);
    }
    return results;
  }

  async getSubscriptionStatus(shopId: string) {
    const shop = await this.prisma.shop.findUnique({
      where: { id: shopId },
      select: {
        subscriptionPlan: true,
        subscriptionStatus: true,
        paymentStatus: true,
        nextPaymentDue: true,
        selfReportedPaid: true,
      },
    });
    if (!shop) throw new NotFoundException('Shop not found');

    const lastPayment = await this.prisma.subscriptionPayment.findFirst({
      where: { shopId },
      orderBy: { paidAt: 'desc' },
    });

    let daysUntilDue: number | null = null;
    if (shop.nextPaymentDue) {
      const now = new Date();
      const due = new Date(shop.nextPaymentDue);
      daysUntilDue = Math.ceil((due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    }

    return {
      ...shop,
      daysUntilDue,
      lastPayment: lastPayment
        ? { amount: lastPayment.amount, paidAt: lastPayment.paidAt, method: lastPayment.method }
        : null,
    };
  }

  async selfReportPayment(shopId: string) {
    return this.prisma.shop.update({
      where: { id: shopId },
      data: { selfReportedPaid: true },
    });
  }
}
