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

  // POST /sales/held-bills
  async create(dto: CreateHeldBillDto) {
    const expires_at = new Date(Date.now() + 30 * 60 * 1000); 

    try {
      return await this.prisma.heldBill.create({
        data: {
          cashier_id: dto.cashier_id,
          cart_items: dto.cart_items,
          reserved_stock: dto.reserved_stock || {},
          expires_at,
        },
      });
    } catch (error) {
      this.logger.error('Failed to create held bill', error);
      throw new InternalServerErrorException('Failed to hold bill');
    }
  }

  // GET /sales/held-bills
  async findByCashier(cashier_id: string) {
    return this.prisma.heldBill.findMany({
      where: {
        cashier_id,
        expires_at: { gt: new Date() },
      },
      orderBy: { created_at: 'desc' },
    });
  }

  // DELETE /sales/held-bills/:id
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