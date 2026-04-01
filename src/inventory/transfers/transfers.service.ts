import {
  Injectable,
  NotFoundException,
  BadRequestException,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateTransferDto } from './dto/create-transfer.dto';
import { UpdateTransferDto } from './dto/update-transfer.dto';
import { ApproveTransferDto } from './dto/approve-transfer.dto';
import { ReceiveTransferDto } from './dto/receive-transfer.dto';
import { WarehousesService } from '../warehouses/warehouses.service';

@Injectable()
export class TransfersService {
  private readonly logger = new Logger(TransfersService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly warehousesService: WarehousesService,
) {}

  // Transfer number auto-generate: TRF-YYYY-NNNNN
  private async generateTransferNumber(): Promise<string> {
    const year = new Date().getFullYear();
    const count = await this.prisma.stockTransfer.count();
    const sequence = String(count + 1).padStart(5, '0');
    return `TRF-${year}-${sequence}`;
  }

  // POST /stock-transfers
  async create(dto: CreateTransferDto) {
    
      const feature = await this.prisma.tenantFeature.findUnique({
    where: {
      tenant_id_feature: {
        tenant_id: dto.tenant_id,
        feature: 'multi_branch',
      },
    },
  });

  if (!feature || !feature.is_enabled) {
    throw new BadRequestException(
      'Stock transfers require multi_branch feature (Business plan and above)',
    );
  }

    if (dto.from_warehouse_id === dto.to_warehouse_id) {
      throw new BadRequestException('From and To warehouses must be different');
    }

      const fromWarehouse = await this.warehousesService.findOne(dto.from_warehouse_id);
  if (!fromWarehouse.is_active) {
    throw new BadRequestException('Source warehouse is inactive');
  }

  const toWarehouse = await this.warehousesService.findOne(dto.to_warehouse_id);
  if (!toWarehouse.is_active) {
    throw new BadRequestException('Destination warehouse is inactive');
  }

    const transfer_number = await this.generateTransferNumber();

    try {
      return await this.prisma.stockTransfer.create({
        data: {
          transfer_number,
          tenant_id: dto.tenant_id,
          from_warehouse_id: dto.from_warehouse_id,
          to_warehouse_id: dto.to_warehouse_id,
          status: 'pending',
          created_by: dto.created_by,
          items: {
            create: dto.items.map((item) => ({
              product_id: item.product_id,
              quantity_requested: item.quantity_requested,
            })),
          },
        },
        include: { items: true },
      });
    } catch (error) {
      this.logger.error('Failed to create transfer', error);
      throw new InternalServerErrorException('Failed to create transfer');
    }
  }

  // GET /stock-transfers
  async findAll() {
    return this.prisma.stockTransfer.findMany({
      include: { items: true },
      orderBy: { created_at: 'desc' },
    });
  }

  // GET /stock-transfers/:id
  async findOne(id: string) {
    const transfer = await this.prisma.stockTransfer.findUnique({
      where: { id },
      include: { items: true },
    });
    if (!transfer) throw new NotFoundException('Transfer not found');
    return transfer;
  }

  // PATCH /stock-transfers/:id
  async update(id: string, dto: UpdateTransferDto) {
    const transfer = await this.findOne(id);

    if (transfer.status !== 'pending') {
      throw new BadRequestException('Only pending transfers can be edited');
    }

    try {
      if (dto.items) {
        await this.prisma.stockTransferItem.deleteMany({
          where: { transfer_id: id },
        });
      }

      return await this.prisma.stockTransfer.update({
        where: { id },
        data: {
          from_warehouse_id: dto.from_warehouse_id,
          to_warehouse_id: dto.to_warehouse_id,
          items: dto.items
            ? {
                create: dto.items.map((item) => ({
                  product_id: item.product_id,
                  quantity_requested: item.quantity_requested,
                })),
              }
            : undefined,
        },
        include: { items: true },
      });
    } catch (error) {
      this.logger.error('Failed to update transfer', error);
      throw new InternalServerErrorException('Failed to update transfer');
    }
  }

  // POST /stock-transfers/:id/approve → pending → in_transit
  async approve(id: string, dto: ApproveTransferDto) {
    const transfer = await this.findOne(id);

    if (transfer.status !== 'pending') {
      throw new BadRequestException('Only pending transfers can be approved');
    }

    try {
      return await this.prisma.$transaction(async (tx) => {
        for (const item of dto.items) {
          const transferItem = transfer.items.find((i) => i.id === item.id);

          // 1. quantity_sent update
          await tx.stockTransferItem.update({
            where: { id: item.id },
            data: { quantity_sent: item.quantity_sent },
          });

          // 2. Source stock deduct
          await tx.stock.upsert({
            where: {
              warehouse_id_product_id: {
                warehouse_id: transfer.from_warehouse_id,
                product_id: transferItem!.product_id,
              },
            },
            update: { quantity: { decrement: item.quantity_sent } },
            create: {
              tenant_id: transfer.tenant_id,
              warehouse_id: transfer.from_warehouse_id,
              product_id: transferItem!.product_id,
              quantity: -item.quantity_sent,
            },
          });

          // 3. StockMovement — transfer_out
          await tx.stockMovement.create({
            data: {
              tenant_id: transfer.tenant_id,
              warehouse_id: transfer.from_warehouse_id,
              product_id: transferItem!.product_id,
              type: 'transfer_out',
              quantity: item.quantity_sent,
              reference_id: id,
            },
          });
        }

        // 4. Status → in_transit
        const updated = await tx.stockTransfer.update({
          where: { id },
          data: {
            status: 'in_transit',
            approved_by: dto.approved_by,
            approved_at: new Date(),
          },
          include: { items: true },
        });

        this.logger.log(`Transfer ${transfer.transfer_number} approved → in_transit`);
        return updated;
      });
    } catch (error) {
      this.logger.error('Failed to approve transfer', error);
      throw new InternalServerErrorException('Failed to approve transfer');
    }
  }

  // POST /stock-transfers/:id/receive → in_transit → received
  async receive(id: string, dto: ReceiveTransferDto) {
    const transfer = await this.findOne(id);

    if (transfer.status !== 'in_transit') {
      throw new BadRequestException('Only in_transit transfers can be received');
    }

    try {
      return await this.prisma.$transaction(async (tx) => {
        for (const item of dto.items) {
          const transferItem = transfer.items.find((i) => i.id === item.id);
          const discrepancy_flag =
            transferItem?.quantity_sent !== null &&
            item.quantity_received !== transferItem?.quantity_sent;

          // 1. quantity_received + discrepancy update
          await tx.stockTransferItem.update({
            where: { id: item.id },
            data: {
              quantity_received: item.quantity_received,
              discrepancy_flag,
            },
          });

          // 2. Destination stock increment
          await tx.stock.upsert({
            where: {
              warehouse_id_product_id: {
                warehouse_id: transfer.to_warehouse_id,
                product_id: transferItem!.product_id,
              },
            },
            update: { quantity: { increment: item.quantity_received } },
            create: {
              tenant_id: transfer.tenant_id,
              warehouse_id: transfer.to_warehouse_id,
              product_id: transferItem!.product_id,
              quantity: item.quantity_received,
            },
          });

          // 3. StockMovement — transfer_in
          await tx.stockMovement.create({
            data: {
              tenant_id: transfer.tenant_id,
              warehouse_id: transfer.to_warehouse_id,
              product_id: transferItem!.product_id,
              type: 'transfer_in',
              quantity: item.quantity_received,
              reference_id: id,
            },
          });

          if (discrepancy_flag) {
            this.logger.warn(
              `Discrepancy on ${transfer.transfer_number}: sent=${transferItem?.quantity_sent}, received=${item.quantity_received}`,
            );
          }
        }

        // 4. Status → received
        const updated = await tx.stockTransfer.update({
          where: { id },
          data: {
            status: 'received',
            received_by: dto.received_by,
            received_at: new Date(),
          },
          include: { items: true },
        });

        this.logger.log(`Transfer ${transfer.transfer_number} received`);
        return updated;
      });
    } catch (error) {
      this.logger.error('Failed to receive transfer', error);
      throw new InternalServerErrorException('Failed to receive transfer');
    }
  }

  // POST /stock-transfers/:id/cancel
  async cancel(id: string) {
    const transfer = await this.findOne(id);

    if (!['pending', 'in_transit'].includes(transfer.status)) {
      throw new BadRequestException('Only pending or in_transit transfers can be cancelled');
    }

    try {
      return await this.prisma.$transaction(async (tx) => {
        // in_transit නම් stock reverse කරන්න ඕනේ
        if (transfer.status === 'in_transit') {
          for (const item of transfer.items) {
            // Stock reverse
            await tx.stock.update({
              where: {
                warehouse_id_product_id: {
                  warehouse_id: transfer.from_warehouse_id,
                  product_id: item.product_id,
                },
              },
              data: { quantity: { increment: item.quantity_sent ?? 0 } },
            });

            // StockMovement — reversal
            await tx.stockMovement.create({
              data: {
                tenant_id: transfer.tenant_id,
                warehouse_id: transfer.from_warehouse_id,
                product_id: item.product_id,
                type: 'transfer_out',
                quantity: -(item.quantity_sent ?? 0),
                reference_id: id,
              },
            });
          }
        }

        return await tx.stockTransfer.update({
          where: { id },
          data: { status: 'cancelled' },
          include: { items: true },
        });
      });
    } catch (error) {
      this.logger.error('Failed to cancel transfer', error);
      throw new InternalServerErrorException('Failed to cancel transfer');
    }
  }
}