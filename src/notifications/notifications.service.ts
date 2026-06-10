import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class NotificationsService {
  constructor(private readonly prisma: PrismaService) {}

  async getNotifications(tenantId: string, userId: string, limit = 50) {
    return this.prisma.notification.findMany({
      where: {
        tenantId,
        OR: [{ userId: null }, { userId }],
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }

  async getUnreadCount(tenantId: string, userId: string) {
    return this.prisma.notification.count({
      where: {
        tenantId,
        isRead: false,
        OR: [{ userId: null }, { userId }],
      },
    });
  }

  async markAllAsRead(tenantId: string, userId: string) {
    return this.prisma.notification.updateMany({
      where: {
        tenantId,
        isRead: false,
        OR: [{ userId: null }, { userId }],
      },
      data: { isRead: true },
    });
  }

  async clearAll(tenantId: string, userId: string) {
    return this.prisma.notification.deleteMany({
      where: {
        tenantId,
        OR: [{ userId: null }, { userId }],
      },
    });
  }

  // Method to create a notification internally
  async create(data: {
    tenantId: string;
    userId?: string;
    title: string;
    message: string;
    type: 'INFO' | 'WARNING' | 'SUCCESS' | 'ERROR';
    link?: string;
  }) {
    return this.prisma.notification.create({
      data: {
        tenantId: data.tenantId,
        userId: data.userId ?? null,
        title: data.title,
        message: data.message,
        type: data.type,
        link: data.link,
      },
    });
  }
}
