import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ExpensesService {
  constructor(private prisma: PrismaService) {}

  async create(tenantId: string, userId: string, data: any) {
    if (!data.amount || isNaN(Number(data.amount))) {
      throw new BadRequestException('Valid amount is required');
    }

    const expense = await this.prisma.expense.create({
      data: {
        tenantId,
        userId,
        entryType: data.entryType || 'MISC',
        category: data.category || 'Category C',
        description: data.description || '',
        amount: Number(data.amount),
        labourerName: data.labourerName,
        labourerPhone: data.labourerPhone,
        status: 'COMPLETED',
      },
    });

    return {
      success: true,
      message: 'Expense entry logged successfully',
      data: expense,
    };
  }

  async findAll(tenantId: string, userId?: string, category?: string, startDate?: string, endDate?: string) {
    const where: any = { tenantId };
    if (userId) {
      where.userId = userId;
    }
    if (category) {
      where.category = category;
    }
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) {
        where.createdAt.gte = new Date(startDate + 'T00:00:00.000Z');
      }
      if (endDate) {
        // Include the full end day
        const end = new Date(endDate + 'T00:00:00.000Z');
        end.setUTCDate(end.getUTCDate() + 1);
        where.createdAt.lt = end;
      }
    }

    const expenses = await this.prisma.expense.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 500,
      include: {
        user: {
          select: { first_name: true, last_name: true, role: true }
        }
      }
    });

    return {
      success: true,
      data: expenses.map(e => ({
        id: e.id,
        entryType: e.entryType,
        category: e.category,
        description: e.description,
        amount: Number(e.amount),
        labourerName: e.labourerName,
        labourerPhone: e.labourerPhone,
        status: e.status,
        createdAt: e.createdAt,
        staffName: e.user ? `${e.user.first_name ?? ''} ${e.user.last_name ?? ''}`.trim() : 'Unknown',
        role: e.user?.role ?? 'staff',
      })),
    };
  }
}
