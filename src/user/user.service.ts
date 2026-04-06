import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuthUser } from '../auth/interfaces/auth-user.interface';
import { UserRecord } from '../auth/interfaces/user-record.interface';

@Injectable()
export class UserService {
  constructor(private readonly prisma: PrismaService) {}

  async findById(userId: string): Promise<AuthUser | null> {
    return this.prisma.db.user.findUnique({
      where: { userId },
      select: {
        userId: true,
        email: true,
        role: true,
        isActive: true,
        isVerified: true,
        tenantId: true,
      },
    }) as Promise<AuthUser | null>;
  }

  async findByEmailWithCredentials(email: string): Promise<UserRecord | null> {
    return this.prisma.db.user.findUnique({
      where: { email },
      select: {
        userId: true,
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
    }) as Promise<UserRecord | null>;
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
