import {
  Injectable,
  NotFoundException,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateHeldBillDto } from './dto/create-held-bill.dto';

@Injectable()
export class HeldBillsService {
  private readonly logger = new Logger(HeldBillsService.name);

  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateHeldBillDto) {
    const expires_at = new Date(Date.now() + 30 * 60 * 1000);

    try {
      return await this.prisma.heldBill.create({
        data: {
          cashierId: dto.cashier_id,
          cartItems: dto.cart_items,
          reservedStock: dto.reserved_stock || {},
          expiresAt: expires_at,
        },
      });
    } catch (error) {
      this.logger.error('Failed to create held bill', error);
      throw new InternalServerErrorException('Failed to hold bill');
    }
  }

  async findByCashier(cashier_id: string) {
    return this.prisma.heldBill.findMany({
      where: {
        cashierId: cashier_id,
        expiresAt: { gt: new Date() },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async remove(id: string) {
    const bill = await this.prisma.heldBill.findUnique({ where: { id } });
    if (!bill) throw new NotFoundException('Held bill not found');

    try {
      await this.prisma.heldBill.delete({ where: { id } });
      return { message: 'Held bill discarded successfully' };
    } catch (error) {
      this.logger.error('Failed to discard held bill', error);
      throw new InternalServerErrorException('Failed to discard held bill');
    }
  }
}