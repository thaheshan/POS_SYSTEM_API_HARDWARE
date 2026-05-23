import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AdminService {
  constructor(private readonly prisma: PrismaService) {}

  async getPendingShops() {
    // Find all users with OWNER role and PENDING_APPROVAL status
    // Include their associated shop details
    const pendingOwners = await this.prisma.user.findMany({
      where: {
        role: 'OWNER',
        status: 'PENDING_APPROVAL',
      },
      include: {
        shop: true,
      },
      orderBy: {
        created_at: 'desc',
      },
    });

    return pendingOwners.map(owner => ({
      userId: owner.user_id,
      email: owner.email,
      firstName: owner.first_name,
      lastName: owner.last_name,
      phone: owner.phone,
      createdAt: owner.created_at,
      shop: owner.shop ? {
        id: owner.shop.id,
        name: owner.shop.name,
        businessRegistration: owner.shop.businessRegistration,
      } : null,
    }));
  }

  async approveShop(userId: string) {
    const owner = await this.prisma.user.findUnique({
      where: { user_id: userId },
      include: { shop: true },
    });

    if (!owner || owner.role !== 'OWNER') {
      throw new NotFoundException('Owner not found');
    }

    if (owner.status !== 'PENDING_APPROVAL') {
      throw new BadRequestException('Shop owner is not in pending status');
    }

    await this.prisma.user.update({
      where: { user_id: userId },
      data: {
        status: 'APPROVED',
        is_active: true,
      },
    });

    return { message: 'Shop approved successfully' };
  }

  async rejectShop(userId: string) {
    const owner = await this.prisma.user.findUnique({
      where: { user_id: userId },
    });

    if (!owner || owner.role !== 'OWNER') {
      throw new NotFoundException('Owner not found');
    }

    if (owner.status !== 'PENDING_APPROVAL') {
      throw new BadRequestException('Shop owner is not in pending status');
    }

    await this.prisma.user.update({
      where: { user_id: userId },
      data: {
        status: 'REJECTED',
        is_active: false,
      },
    });

    return { message: 'Shop rejected successfully' };
  }
}
