import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuthUser } from '../auth/interfaces/auth-user.interface';
import { UserRecord } from '../auth/interfaces/user-record.interface';

@Injectable()
export class UserService {
  constructor(private readonly prisma: PrismaService) {}

  async findById(userId: string): Promise<AuthUser | null> {
    const user = await this.prisma.db.user.findUnique({
      where: { user_id: userId },
      include: { role: true },
    });

    if (!user) return null;
    return {
      user_id: user.user_id,
      email: user.email,
      role: user.role?.name ?? 'UNKNOWN',
      is_active: user.is_active,
      is_verified: user.is_verified,
      tenant_id: user.tenant_id ?? '',
      totp_secret: user.totp_secret ?? undefined,
      phone_number: user.phone_number ?? undefined,
      two_factor_enabled: user.two_factor_enabled,
    } as AuthUser;
  }

  async findByEmailWithCredentials(email: string): Promise<UserRecord | null> {
    const user = await this.prisma.db.user.findUnique({
      where: { email },
      include: { role: true },
    });

    if (!user) return null;
    return {
      user_id: user.user_id,
      email: user.email,
      password_hash: user.password_hash,
      first_name: user.first_name,
      last_name: user.last_name,
      role: user.role?.name ?? 'UNKNOWN',
      is_active: user.is_active,
      is_verified: user.is_verified,
      tenant_id: user.tenant_id ?? '',
      failed_login_attempts: user.failed_login_attempts,
      account_locked_until: user.account_locked_until,
      totp_secret: user.totp_secret ?? undefined,
      phone_number: user.phone_number ?? undefined,
      two_factor_enabled: user.two_factor_enabled,
      status: user.status,
    } as UserRecord;
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
