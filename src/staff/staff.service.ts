import {
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { RegisterStaffDto } from './dto/register-staff.dto';
import * as bcrypt from 'bcrypt';
import { StaffAlreadyExistsException } from './exceptions/staff-already-exists.exception';
import { Prisma } from '@prisma/client';

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
          phone: dto.mobile_number,
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

      throw new InternalServerErrorException('Failed to create staff account');
    }
  }
}
