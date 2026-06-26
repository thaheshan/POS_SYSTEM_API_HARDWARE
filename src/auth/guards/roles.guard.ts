import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthUser } from '../interfaces/auth-user.interface';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.get<string[]>('roles', context.getHandler());
    if (!requiredRoles) {
      return true; // No roles required, allow access
    }

    const request = context.switchToHttp().getRequest();
    const user: AuthUser = request.user;

    if (!user || !user.role) {
      console.log(`RolesGuard Failed: No user or user.role found in request`);
      throw new ForbiddenException('INSUFFICIENT_PERMISSIONS');
    }

    if (!requiredRoles.includes(user.role)) {
      console.log(`RolesGuard Failed: User role "${user.role}" not in requiredRoles [${requiredRoles.join(', ')}]`);
      throw new ForbiddenException('INSUFFICIENT_PERMISSIONS');
    }

    return true;
  }
}