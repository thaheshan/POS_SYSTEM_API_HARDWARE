import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  UnauthorizedException,
  Logger,
} from '@nestjs/common';
import { Request } from 'express';
import { UserRole } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

interface JwtPayload {
  user_id: string;
  role: string;
  is_active: boolean;
  email: string;
  tenant_id: string;
  is_verified: boolean;
}

interface AuthRequest extends Request {
  user?: JwtPayload;
  tenant_id?: string;
}

/**
 * DEPRECATED: Use JwtAuthGuard with @SetMetadata('roles', [...]) instead
 *
 * This guard has been consolidated into JwtAuthGuard for security and maintainability.
 * Having two separate guards (JwtAuthGuard + RoleAccessGuard) creates risk of:
 * - Guard bypass: Accidentally applying only JwtAuthGuard without RoleAccessGuard
 * - Inconsistent security: Different role verification logic in two places
 * - Privilege escalation: Client could bypass RoleAccessGuard if only JwtAuthGuard used
 *
 * MIGRATION GUIDE:
 * Before:
 *   @UseGuards(JwtAuthGuard, RoleAccessGuard)
 *   @SetMetadata('roles', [UserRole.owner])
 *   getOwnerDashboard() { ... }
 *
 * After:
 *   @UseGuards(JwtAuthGuard)
 *   @SetMetadata('roles', [UserRole.owner])
 *   getOwnerDashboard() { ... }
 *
 * JwtAuthGuard now handles both JWT validation AND role checking automatically.
 */
@Injectable()
export class RoleAccessGuard implements CanActivate {
  private readonly logger = new Logger(RoleAccessGuard.name);

  constructor(private prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    this.logger.warn(
      'DEPRECATED: RoleAccessGuard is deprecated. Use JwtAuthGuard with @SetMetadata("roles", [...]) instead.',
    );

    const request = context.switchToHttp().getRequest<AuthRequest>();
    const requiredRoles = Reflect.getMetadata(
      'roles',
      context.getHandler(),
    ) as UserRole[];

    // No role restriction if metadata not set
    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    // Step 1: Validate JWT payload contains user info
    const user = (request.user as JwtPayload) || {};
    if (!user.user_id || !user.role || !user.is_active) {
      this.logger.warn(
        `Invalid JWT: missing required user data (user_id: ${!!user.user_id}, role: ${!!user.role}, is_active: ${user.is_active})`,
      );
      throw new UnauthorizedException({
        error: 'INVALID_JWT',
        message: 'User information missing from token',
      });
    }

    try {
      // Step 2: Query database to verify current user role and status
      const dbUser = await this.prisma.user.findUnique({
        where: { user_id: user.user_id },
        select: {
          user_id: true,
          role: true,
          is_active: true,
          tenant_id: true,
        },
      });

      // Step 3: Validate user exists and is active
      if (!dbUser) {
        this.logger.warn(`User ${user.user_id} not found in database`);
        throw new UnauthorizedException({
          error: 'USER_NOT_FOUND',
          message: 'User does not exist',
        });
      }

      if (!dbUser.is_active) {
        this.logger.warn(`User ${user.user_id} is inactive`);
        throw new UnauthorizedException({
          error: 'USER_INACTIVE',
          message: 'User account is inactive',
        });
      }

      // Step 4: Verify JWT role matches database role
      // This catches cases where JWT was issued with a role that has since changed
      if (dbUser.role !== user.role) {
        this.logger.warn(
          `JWT role mismatch for user ${user.user_id}: JWT has ${user.role}, DB has ${dbUser.role}`,
        );
        throw new ForbiddenException({
          error: 'ROLE_MISMATCH',
          message: 'User role has changed. Please login again.',
          jwt_role: user.role,
          current_role: dbUser.role,
        });
      }

      // Step 5: Verify database role is in required roles list
      if (!requiredRoles.includes(dbUser.role)) {
        this.logger.warn(
          `User ${user.user_id} with role ${dbUser.role} denied access. Required: ${requiredRoles.join(', ')}`,
        );
        throw new ForbiddenException({
          error: 'INSUFFICIENT_ROLE',
          message: 'User role does not have access to this resource',
          user_role: dbUser.role,
          required_roles: requiredRoles,
        });
      }

      // Step 6: Attach verified tenant_id to request for multi-tenancy enforcement
      request.tenant_id = dbUser.tenant_id;

      return true;
    } catch (error) {
      // Re-throw NestJS exceptions (UnauthorizedException, ForbiddenException)
      if (
        error instanceof UnauthorizedException ||
        error instanceof ForbiddenException
      ) {
        throw error;
      }

      // Handle unexpected database errors
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(
        `Unexpected error verifying user role: ${errorMessage}`,
      );
      throw new UnauthorizedException({
        error: 'VERIFICATION_FAILED',
        message: 'Failed to verify user credentials',
      });
    }
  }
}
