import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ActivityLogsService {
  constructor(private readonly prisma: PrismaService) {}

  async log(tenantId: string, userId: string, action: string, details: string, amount?: number) {
    try {
      const user = await this.prisma.user.findUnique({
        where: { user_id: userId },
        select: { first_name: true, last_name: true, email: true, role: { select: { name: true } } },
      });

      const userName = user ? `${user.first_name || ''} ${user.last_name || ''}`.trim() || user.email : 'Unknown';
      const userRole = user?.role?.name || 'Member';

      await this.prisma.activityLog.create({
        data: {
          tenantId,
          userId,
          userName,
          userRole,
          action,
          details,
          amount,
        },
      });
      
      const fs = require('fs');
      fs.appendFileSync('activity-log-debug.txt', `SUCCESS: Logged ${action} for ${userName}\n`);
    } catch (error: any) {
      console.error('Failed to log activity:', error);
      const fs = require('fs');
      fs.appendFileSync('activity-log-debug.txt', `ERROR: Failed to log ${action} - ${error.message}\n`);
    }
  }

  async findAll(tenantId: string, startDate?: string, endDate?: string, searchUser?: string) {
    const where: any = { tenantId };

    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) {
        where.createdAt.gte = new Date(startDate);
      }
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        where.createdAt.lte = end;
      }
    }

    if (searchUser) {
      where.OR = [
        { userName: { contains: searchUser, mode: 'insensitive' } },
        { user: { email: { contains: searchUser, mode: 'insensitive' } } }
      ];
    }

    return this.prisma.activityLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });
  }
}
