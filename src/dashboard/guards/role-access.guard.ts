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
 * Guard to enforce role-based access control on dashboard endpoints with database verification
 * SECURITY: Verifies user role against database on every request, ensuring role changes
 * (promotions/demotions/terminations) are immediately enforced without waiting for JWT expiration
 *
 * Usage: @UseGuards(RoleAccessGuard) in controller with
 * @SetMetadata('roles', [UserRole.owner]) on the handler
 *
 * Performance: Adds ~1-3ms overhead per request (single DB query)
 * Tradeoff: Maximum security vs minimal performance impact - acceptable for dashboard endpoints
 */
@Injectable()
export class RoleAccessGuard implements CanActivate {
  private readonly logger = new Logger(RoleAccessGuard.name);

  constructor(private prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
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
