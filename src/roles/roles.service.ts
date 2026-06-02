import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class RolesService {
  constructor(private readonly prisma: PrismaService) {}

  async getRoles(tenantId: string) {
    const roles = await this.prisma.db.role.findMany({
      where: { tenant_id: tenantId },
      include: {
        _count: {
          select: { users: true }
        }
      },
      orderBy: { created_at: 'asc' },
    });

    return roles.map(r => ({
      id: r.id,
      name: r.name,
      permissions: r.permissions || [],
      userCount: r._count.users,
      createdAt: r.created_at,
    }));
  }

  async createRole(tenantId: string, name: string, permissions: any) {
    if (!name) throw new BadRequestException('Role name is required');

    // Check if role name exists for this tenant
    const existing = await this.prisma.db.role.findFirst({
      where: { tenant_id: tenantId, name: { equals: name, mode: 'insensitive' } }
    });

    if (existing) throw new BadRequestException('Role with this name already exists');

    const role = await this.prisma.db.role.create({
      data: {
        name,
        permissions: permissions || {},
        tenant_id: tenantId,
      }
    });

    return { id: role.id, name: role.name, permissions: role.permissions };
  }

  async updateRole(id: string, tenantId: string, name: string, permissions: any) {
    const role = await this.prisma.db.role.findFirst({
      where: { id, tenant_id: tenantId }
    });

    if (!role) throw new NotFoundException('Role not found');

    const updated = await this.prisma.db.role.update({
      where: { id },
      data: {
        name,
        permissions: permissions ?? role.permissions,
      }
    });

    return { id: updated.id, name: updated.name, permissions: updated.permissions };
  }

  async deleteRole(id: string, tenantId: string) {
    const role = await this.prisma.db.role.findFirst({
      where: { id, tenant_id: tenantId },
      include: {
        _count: { select: { users: true } }
      }
    });

    if (!role) throw new NotFoundException('Role not found');

    if (role._count.users > 0) {
      throw new BadRequestException('Cannot delete role because it is assigned to one or more staff members. Please reassign them first.');
    }

    if (role.name.toUpperCase() === 'OWNER') {
      throw new BadRequestException('Cannot delete the built-in OWNER role.');
    }

    await this.prisma.db.role.delete({ where: { id } });

    return { message: 'Role deleted successfully' };
  }
}
