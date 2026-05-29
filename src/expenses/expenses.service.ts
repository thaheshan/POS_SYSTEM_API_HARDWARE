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

  async findAll(tenantId: string, userId?: string, category?: string) {
    const where: any = { tenantId };
    if (userId) {
      where.userId = userId;
    }
    if (category) {
      where.category = category;
    }

    const expenses = await this.prisma.expense.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 100, // Limit to recent 100 for now
    });

    return {
      success: true,
      data: expenses.map(e => ({
        ...e,
        amount: Number(e.amount),
      })),
    };
  }
}
