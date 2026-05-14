import { HttpException, Injectable, Logger } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { RegisterStaffDto } from './dto/register-staff.dto';
import * as bcrypt from 'bcrypt';
import { Prisma, StaffStatus } from '@prisma/client';
import { NotifyOwnerDto } from './dto/notify-owner.dto';
import {
  ApproveStaffException,
  GetStaffStatusException,
  InvalidStaffActionException,
  InvalidStaffShopAssociationException,
  NotifyShopOwnerException,
  RegisterStaffException,
  ShopOwnerNotFoundException,
  StaffAlreadyExistsException,
  StaffNotFoundException,
  UnauthorizedStaffApprovalException,
} from './exceptions/staff.exceptions';
import { ApproveStaffDto } from './dto/approve-staff.dto';

@Injectable()
export class StaffService {
  private readonly logger = new Logger(StaffService.name);
  constructor(private readonly prisma: PrismaService) {}

  async registerStaff(dto: RegisterStaffDto) {
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(dto.password, saltRounds);

    const nameParts = dto.full_name.trim().split(' ');
    const firstName = nameParts[0];
    const lastName = nameParts.length > 1 ? nameParts.slice(1).join(' ') : null;
    const normalizedPhone = dto.mobile_number?.replace(/\s+/g, '') ?? null;

    this.logger.log(
      `Attempting to register new staff member with email: ${dto.email}`,
    );

    try {
      const newStaff = await this.prisma.user.create({
        data: {
          email: dto.email,
          password_hash: hashedPassword,
          first_name: firstName,
          last_name: lastName,
          phone: normalizedPhone,
          role: dto.role,
          tenant_id: dto.shop_id,
        },
      });

      this.logger.log(
        `Successfully registered staff member: ${newStaff.user_id}`,
      );

      return {
        message: 'Staff account created, pending Shop Owner approval',
        staff_id: newStaff.user_id,
      };
    } catch (error: unknown) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (
          error.code === 'P2002' &&
          (error.meta?.target as string[])?.includes('email')
        ) {
          this.logger.warn(
            `Registration failed: Email ${dto.email} already exists.`,
          );
          throw new StaffAlreadyExistsException(dto.email);
        }
      }
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(
        `Failed to register staff member ${dto.email}. Error: ${errorMessage}`,
      );

      throw new RegisterStaffException();
    }
  }

  async notifyShopOwner(dto: NotifyOwnerDto) {
    this.logger.log(
      `Processing in-app notification to owner for Shop: ${dto.shop_id} regarding Staff: ${dto.staff_id}`,
    );
    try {
      const staffMember = await this.prisma.user.findFirst({
        where: {
          user_id: dto.staff_id,
          tenant_id: dto.shop_id,
          status: StaffStatus.PENDING_APPROVAL,
        },
        include: {
          shop: true,
        },
      });

      if (!staffMember) {
        this.logger.warn(
          `Notification failed: Invalid staff (${dto.staff_id}) or shop (${dto.shop_id}).`,
        );
        throw new InvalidStaffShopAssociationException();
      }

      const shopOwner = await this.prisma.user.findFirst({
        where: {
          tenant_id: dto.shop_id,
          role: 'OWNER',
          is_active: true,
        },
      });

      if (!shopOwner) {
        this.logger.error(
          `Cannot find active owner for Shop ID: ${dto.shop_id}`,
        );
        throw new ShopOwnerNotFoundException();
      }

      // TODO: Implement actual notification logic here (e.g., create a notification record in the database, send an email, etc.)
      /*
      await this.prisma.notification.create({
        data: {
          user_id: shopOwner.user_id,
          title: 'New Staff Request',
          message: `${staffMember.first_name} requested access to ${staffMember.shop.name}.`,
          type: 'STAFF_APPROVAL',
          is_read: false
        }
      });
      */

      this.logger.log(
        `Notification sent to Shop Owner (${shopOwner.user_id}) about Staff (${staffMember.user_id}).`,
      );
      return { message: 'Shop owner notified about staff registration.' };
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }

      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(
        `Failed to notify shop owner for Staff ID: ${dto.staff_id}. Error: ${errorMessage}`,
      );
      throw new NotifyShopOwnerException();
    }
  }

  async getStaffStatus(staffId: string) {
    try {
      const staff = await this.prisma.user.findUnique({
        where: { user_id: staffId },
        select: {
          user_id: true,
          status: true,
          is_active: true,
          is_verified: true,
        },
      });

      if (!staff) {
        throw new StaffNotFoundException(staffId);
      }

      return staff;
    } catch (error: unknown) {
      if (error instanceof StaffNotFoundException) throw error;
      this.logger.error(`Failed to retrieve status for staff ${staffId}`);
      throw new GetStaffStatusException();
    }
  }

  async approveStaff(dto: ApproveStaffDto, ownerId: string) {
    this.logger.log(
      `Owner ${ownerId} attempting to ${dto.action} staff ${dto.staff_id}`,
    );

    try {
      const staffMember = await this.prisma.user.findUnique({
        where: { user_id: dto.staff_id },
      });

      if (!staffMember) {
        throw new InvalidStaffActionException('Invalid staff ID provided.');
      }

      if (staffMember.status !== StaffStatus.PENDING_APPROVAL) {
        throw new InvalidStaffActionException(
          `Staff account is already ${staffMember.status}`,
        );
      }

      const shopOwner = await this.prisma.user.findFirst({
        where: {
          user_id: ownerId,
          tenant_id: staffMember.tenant_id,
          role: 'OWNER',
          is_active: true,
        },
      });

      if (!shopOwner) {
        this.logger.warn(
          `User ${ownerId} attempted to approve staff for a shop they do not own.`,
        );
        throw new UnauthorizedStaffApprovalException();
      }

      const newStatus: StaffStatus =
        dto.action === 'approve' ? StaffStatus.APPROVED : StaffStatus.REJECTED;
      const isActiveAndVerified = dto.action === 'approve';

      const updated = await this.prisma.user.update({
        where: { user_id: dto.staff_id },
        data: {
          status: newStatus,
          is_active: isActiveAndVerified,
          is_verified: isActiveAndVerified,
        },
        select: {
          user_id: true,
          status: true,
          is_active: true,
          is_verified: true,
        },
      });

      this.logger.log(
        `[IN-APP NOTIFICATION] To Staff ${dto.staff_id}: Your account has been ${String(newStatus).toLowerCase()}.`,
      );

      return {
        message: `Staff account ${dto.action}d successfully`,
        status: updated,
      };
    } catch (error: unknown) {
      if (error instanceof HttpException) {
        throw error;
      }

      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(
        `Failed to process approval for ${dto.staff_id}: ${errorMessage}`,
      );
      throw new ApproveStaffException();
    }
  }
}
