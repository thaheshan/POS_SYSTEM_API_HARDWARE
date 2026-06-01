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
        role: { name: 'OWNER' },
        status: 'PENDING_APPROVAL',
      },
      include: {
        shop: true,
        role: true,
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
      include: { shop: true, role: true },
    });

    if (!owner || owner.role?.name !== 'OWNER') {
      throw new NotFoundException('Owner not found');
    }

    if (owner.status !== 'PENDING_APPROVAL') {
      throw new BadRequestException('Shop owner is not in pending status');
    }

    if (!owner.shop) {
      throw new BadRequestException('Owner does not have a shop associated');
    }

    const nextDue = new Date();
    nextDue.setMonth(nextDue.getMonth() + 1);

    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { user_id: userId },
        data: {
          status: 'APPROVED',
          is_active: true,
        },
      }),
      this.prisma.shop.update({
        where: { id: owner.shop.id },
        data: {
          subscriptionStatus: 'ACTIVE',
          nextPaymentDue: nextDue
        }
      })
    ]);

    return { message: 'Shop approved successfully' };
  }

  async rejectShop(userId: string) {
    const owner = await this.prisma.user.findUnique({
      where: { user_id: userId },
      include: { role: true },
    });

    if (!owner || owner.role?.name !== 'OWNER') {
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

  async getActiveShops() {
    const shops = await this.prisma.shop.findMany({
      where: {
        users: {
          some: {
            role: { name: 'OWNER' },
            status: 'APPROVED'
          }
        }
      },
      include: {
        users: {
          where: { role: { name: 'OWNER' } }
        },
        subscriptionPayments: {
          orderBy: { paidAt: 'desc' },
          take: 1
        }
      }
    });

    return shops.map(shop => {
      const owner = shop.users[0];
      const lastPayment = shop.subscriptionPayments[0];
      return {
        id: shop.id,
        name: shop.name,
        businessRegistration: shop.businessRegistration,
        subscriptionStatus: shop.subscriptionStatus,
        nextPaymentDue: shop.nextPaymentDue,
        selfReportedPaid: shop.selfReportedPaid,
        address: shop.address,
        city: shop.city,
        district: shop.district,
        province: shop.province,
        owner: owner ? {
          firstName: owner.first_name,
          lastName: owner.last_name,
          email: owner.email,
          phone: owner.phone
        } : null,
        lastPayment: lastPayment ? {
          amount: lastPayment.amount,
          paidAt: lastPayment.paidAt
        } : null
      };
    });
  }

  async selfReportPayment(shopId: string) {
    // Only flag as self-reported - do NOT set paymentStatus to PAID yet
    // Admin must confirm before it counts as officially paid
    await this.prisma.shop.update({
      where: { id: shopId },
      data: {
        selfReportedPaid: true,
      }
    });

    // Fetch shop info to build notification
    const shop = await this.prisma.shop.findUnique({
      where: { id: shopId },
    });

    if (shop) {
      await this.prisma.notification.create({
        data: {
          tenantId: shop.id,
          title: 'Self-Reported Payment',
          message: `Shop "${shop.name}" (${shop.businessRegistration ?? 'N/A'}) has self-reported their subscription payment. Please verify and confirm.`,
          type: 'INFO',
          link: `/dashboard/notifications`
        }
      });
    }

    return { message: 'Payment self-reported successfully. Awaiting admin confirmation.' };
  }

  async confirmSelfReportPayment(shopId: string, adminName?: string) {
    const nextDue = new Date();
    nextDue.setMonth(nextDue.getMonth() + 1);

    await this.prisma.$transaction([
      // Record the official payment
      this.prisma.subscriptionPayment.create({
        data: {
          shopId,
          amount: 0, // Admin can update amount separately if needed
          method: 'SELF_REPORTED',
          notes: 'Confirmed by admin after shop owner self-report',
          recordedBy: adminName ?? 'Admin',
        }
      }),
      // Update shop status to PAID + ACTIVE + clear self-report flag
      this.prisma.shop.update({
        where: { id: shopId },
        data: {
          paymentStatus: 'PAID',
          subscriptionStatus: 'ACTIVE',
          selfReportedPaid: false,
          nextPaymentDue: nextDue,
        }
      }),
      // Mark related notifications as read
      this.prisma.notification.updateMany({
        where: { tenantId: shopId, title: 'Self-Reported Payment', isRead: false },
        data: { isRead: true }
      })
    ]);

    return { message: 'Payment confirmed successfully. Shop is now active.', nextPaymentDue: nextDue };
  }

  async rejectSelfReportPayment(shopId: string, adminName?: string) {
    await this.prisma.$transaction(async (tx) => {
      // 1. Reset shop's selfReportedPaid flag
      const shop = await tx.shop.update({
        where: { id: shopId },
        data: { selfReportedPaid: false },
        include: { users: { where: { role: { name: 'OWNER' } } } }
      });

      // 2. Mark the admin's notification as read so it disappears from the pending list
      await tx.notification.updateMany({
        where: { tenantId: shopId, title: 'Self-Reported Payment', isRead: false },
        data: { isRead: true }
      });

      // 3. Create a notification for the shop owner
      if (shop.users.length > 0) {
        await tx.notification.create({
          data: {
            tenantId: shop.id,
            userId: shop.users[0].user_id,
            title: 'Payment Not Received',
            message: 'An admin has reviewed your self-reported payment and marked it as not received. Please verify your payment or contact support.',
            type: 'WARNING',
            link: '/settings?tab=billing'
          }
        });
      }
    });

    return { message: 'Self-reported payment rejected successfully.' };
  }

  async getAdminNotifications() {
    const notifications = await this.prisma.notification.findMany({
      where: { title: 'Self-Reported Payment' },
      orderBy: { createdAt: 'desc' },
    });

    // Enrich with shop data
    const enriched = await Promise.all(notifications.map(async (n) => {
      const shop = await this.prisma.shop.findUnique({
        where: { id: n.tenantId },
        select: { id: true, name: true, businessRegistration: true, selfReportedPaid: true, subscriptionStatus: true }
      });
      return { ...n, shop };
    }));

    return enriched;
  }

  async updateShopStatus(shopId: string, status: 'ACTIVE' | 'INACTIVE' | 'SUSPENDED') {
    const shop = await this.prisma.shop.update({
      where: { id: shopId },
      data: { subscriptionStatus: status }
    });
    return { message: 'Shop status updated successfully', shop };
  }

  async recordPayment(shopId: string, amount: number, method: string, notes?: string, recordedBy?: string) {
    const nextDue = new Date();
    nextDue.setMonth(nextDue.getMonth() + 1);

    const payment = await this.prisma.$transaction([
      this.prisma.subscriptionPayment.create({
        data: { shopId, amount, method, notes, recordedBy }
      }),
      this.prisma.shop.update({
        where: { id: shopId },
        data: { 
          subscriptionStatus: 'ACTIVE',
          nextPaymentDue: nextDue
        }
      })
    ]);

    return { message: 'Payment recorded successfully', payment: payment[0] };
  }

  async getShopSubscriptionStatus(shopId: string) {
    const shop = await this.prisma.shop.findUnique({
      where: { id: shopId },
      select: {
        subscriptionStatus: true,
        nextPaymentDue: true,
        selfReportedPaid: true,
        paymentStatus: true,
        subscriptionPayments: {
          orderBy: { paidAt: 'desc' },
          take: 1,
          select: { amount: true, paidAt: true }
        }
      }
    });

    if (!shop) throw new Error('Shop not found');

    const now = new Date();
    const due = shop.nextPaymentDue ? new Date(shop.nextPaymentDue) : null;
    const daysUntilDue = due ? Math.ceil((due.getTime() - now.getTime()) / (1000 * 3600 * 24)) : null;

    // Check if there is a recent unread rejection notification
    const rejectedNotif = await this.prisma.notification.findFirst({
      where: {
        tenantId: shopId,
        title: 'Payment Not Received',
        isRead: false
      }
    });

    return {
      subscriptionStatus: shop.subscriptionStatus,
      nextPaymentDue: shop.nextPaymentDue,
      selfReportedPaid: shop.selfReportedPaid,
      paymentStatus: shop.paymentStatus,
      daysUntilDue,
      lastPayment: shop.subscriptionPayments[0] ?? null,
      paymentRejected: !!rejectedNotif,
    };
  }
}
