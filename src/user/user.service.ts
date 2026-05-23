import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuthUser } from '../auth/interfaces/auth-user.interface';
import { UserRecord } from '../auth/interfaces/user-record.interface';

@Injectable()
export class UserService {
  constructor(private readonly prisma: PrismaService) {}

  async findById(userId: string): Promise<AuthUser | null> {
    return this.prisma.db.user.findUnique({
      where: { user_id: userId },
      select: {
        user_id: true,
        email: true,
        role: true,
        is_active: true,
        is_verified: true,
        tenant_id: true,
        totp_secret: true,
        phone_number: true,
        two_factor_enabled: true,
      },
    }) as Promise<AuthUser | null>;
  }

  async findByEmailWithCredentials(email: string): Promise<UserRecord | null> {
    return this.prisma.db.user.findUnique({
      where: { email },
      select: {
        user_id: true,
        email: true,
        password_hash: true,
        first_name: true,
        last_name: true,
        role: true,
        is_active: true,
        is_verified: true,
        tenant_id: true,
        failed_login_attempts: true,
        account_locked_until: true,
        totp_secret: true,
        phone_number: true,
        two_factor_enabled: true,
        status: true,
      },
    }) as Promise<UserRecord | null>;
  }

  async incrementFailedLoginAttempts(email: string): Promise<void> {
    await this.prisma.db.user.update({
      where: { email },
      data: { failed_login_attempts: { increment: 1 } },
    });
  }

  async resetLoginState(email: string): Promise<void> {
    await this.prisma.db.user.update({
      where: { email },
      data: {
        failed_login_attempts: 0,
        account_locked_until: null,
        last_login: new Date(),
      },
    });
  }

  async updateUser(userId: string, data: Partial<any>): Promise<void> {
    await this.prisma.db.user.update({
      where: { user_id: userId },
      data,
    });
  }
}
