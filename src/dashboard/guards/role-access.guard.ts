import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { UserRole } from '@prisma/client';

/**
 * Guard to enforce role-based access control on dashboard endpoints
 * Usage: @UseGuards(RoleAccessGuard) in controller with
 * @SetMetadata('roles', [UserRole.owner]) on the handler
 */
@Injectable()
export class RoleAccessGuard implements CanActivate {
  private readonly logger = new Logger(RoleAccessGuard.name);

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const requiredRoles = Reflect.getMetadata(
      'roles',
      context.getHandler(),
    ) as UserRole[];

    if (!requiredRoles || requiredRoles.length === 0) {
      return true; // No role restriction if metadata not set
    }

    const user = request.user;
    if (!user || !user.role) {
      this.logger.warn('No user or role in request');
      throw new ForbiddenException({
        error: 'ROLE_ACCESS_DENIED',
        required_role: requiredRoles[0],
      });
    }

    // Check if user's role is in the allowed roles list
    if (!requiredRoles.includes(user.role)) {
      this.logger.warn(
        `User role ${user.role} denied access. Required: ${requiredRoles.join(', ')}`,
      );
      throw new ForbiddenException({
        error: 'ROLE_ACCESS_DENIED',
        required_role:
          requiredRoles.length === 1 ? requiredRoles[0] : requiredRoles,
        user_role: user.role,
      });
    }

    return true;
  }
}
