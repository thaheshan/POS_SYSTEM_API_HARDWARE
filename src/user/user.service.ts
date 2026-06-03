import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuthUser } from '../auth/interfaces/auth-user.interface';
import { UserRecord } from '../auth/interfaces/user-record.interface';

@Injectable()
export class UserService {
  constructor(private readonly prisma: PrismaService) {}

  async findById(userId: string): Promise<AuthUser | null> {
    const user = await this.prisma.db.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        role: true,
        isActive: true,
        isVerified: true,
        tenantId: true,
      },
    });

    if (!user) {
      return null;
    }

    return {
      user_id: user.id,
      email: user.email,
      role: user.role,
      is_active: user.isActive,
      is_verified: user.isVerified,
      tenant_id: user.tenantId,
    };
  }

  async findByEmailWithCredentials(email: string): Promise<UserRecord | null> {
    const user = await this.prisma.db.user.findUnique({
      where: { email },
      select: {
        id: true,
        email: true,
        passwordHash: true,
        firstName: true,
        lastName: true,
        role: true,
        isActive: true,
        isVerified: true,
        tenantId: true,
        failedLoginAttempts: true,
        accountLockedUntil: true,
      },
    });

    if (!user) {
      return null;
    }

    return {
      user_id: user.id,
      email: user.email,
      password_hash: user.passwordHash,
      first_name: user.firstName,
      last_name: user.lastName,
      role: user.role,
      is_active: user.isActive,
      is_verified: user.isVerified,
      tenant_id: user.tenantId,
      failed_login_attempts: user.failedLoginAttempts,
      account_locked_until: user.accountLockedUntil,
    };
  }

  async incrementFailedLoginAttempts(email: string): Promise<void> {
    await this.prisma.db.user.update({
      where: { email },
      data: { failedLoginAttempts: { increment: 1 } },
    });
  }

  async resetLoginState(email: string): Promise<void> {
    await this.prisma.db.user.update({
      where: { email },
      data: {
        failedLoginAttempts: 0,
        accountLockedUntil: null,
        lastLogin: new Date(),
      },
    });
  }
}
