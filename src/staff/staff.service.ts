import { HttpException, Injectable, Logger } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { RegisterStaffDto } from './dto/register-staff.dto';
import * as bcrypt from 'bcrypt';
import { Prisma } from '@prisma/client';
import {
  ApproveStaffException,
  GetStaffStatusException,
  InvalidStaffActionException,
  RegisterStaffException,
  StaffAlreadyExistsException,
  StaffNotFoundException,
  UnauthorizedStaffApprovalException,
} from './exceptions/staff.exceptions';
import { ApproveStaffDto } from './dto/approve-staff.dto';

@Injectable()
export class StaffService {
  private readonly logger = new Logger(StaffService.name);
  constructor(private readonly prisma: PrismaService) {}

  async getAllStaff(tenantId: string) {
    this.logger.log(`Fetching all staff for tenant: ${tenantId}`);
    const staff = await this.prisma.user.findMany({
      where: {
        tenant_id: tenantId,
        status: 'APPROVED',
      },
      select: {
        user_id: true,
        first_name: true,
        last_name: true,
        email: true,
        phone: true,
        role: true,
        is_active: true,
        status: true,
        created_at: true,
      },
      orderBy: { created_at: 'desc' },
    });

    return {
      success: true,
      data: staff.map(s => ({
        id: s.user_id,
        name: `${s.first_name ?? ''} ${s.last_name ?? ''}`.trim(),
        email: s.email,
        phone: s.phone ?? 'N/A',
        role: s.role,
        status: s.is_active ? 'Active' : 'Inactive',
        createdAt: s.created_at,
      })),
    };
  }

  async getPendingStaff(tenantId: string) {
    this.logger.log(`Fetching pending staff for tenant: ${tenantId}`);
    const pending = await this.prisma.user.findMany({
      where: {
        tenant_id: tenantId,
        status: 'PENDING_APPROVAL',
      },
      select: {
        user_id: true,
        first_name: true,
        last_name: true,
        email: true,
        role: true,
        created_at: true,
        shop: { select: { id: true, name: true } },
      },
      orderBy: { created_at: 'desc' },
    });

    return {
      success: true,
      data: pending.map(p => ({
        id: p.user_id,
        name: `${p.first_name ?? ''} ${p.last_name ?? ''}`.trim(),
        email: p.email,
        role: p.role,
        shopId: p.shop?.id ?? 'N/A',
        shopName: p.shop?.name ?? 'N/A',
        submittedAt: p.created_at,
      })),
    };
  }

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
          status: 'PENDING_APPROVAL',
          is_active: false,
        },
      });

      const shopOwner = await this.prisma.user.findFirst({
        where: { tenant_id: dto.shop_id, role: 'OWNER', is_active: true },
      });

      if (shopOwner) {
        /* TODO: Implement actual notification logic here
        await this.prisma.notification.create({
          data: {
            user_id: shopOwner.user_id,
            title: 'New Staff Request',
            message: `${firstName} requested access to your shop.`,
            type: 'STAFF_APPROVAL',
            is_read: false,
          },
        });
        */
        this.logger.log(
          `[IN-APP NOTIFICATION] Sent to Owner ${shopOwner.user_id} for Staff ${newStaff.user_id}`,
        );
      }
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

  async getStaffStatus(staffId: string, requestedById: string) {
    try {
      if (staffId !== requestedById) {
        throw new UnauthorizedStaffApprovalException();
      }
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
      if (error instanceof HttpException) {
        throw error;
      }
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

      if (staffMember.status !== 'PENDING_APPROVAL') {
        // ESLint fix: Use string literal
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

      const newStatus = dto.action === 'approve' ? 'APPROVED' : 'REJECTED';
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

      const actionPastTense =
        dto.action === 'approve' ? 'approved' : 'rejected';

      this.logger.log(
        `[IN-APP NOTIFICATION] To Staff ${dto.staff_id}: Your account has been ${String(newStatus).toLowerCase()}.`,
      );

      return {
        message: `Staff account ${actionPastTense} successfully`,
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
