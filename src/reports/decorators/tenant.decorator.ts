import {
  createParamDecorator,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { AuthenticatedRequest } from 'src/common/interfaces/authenticated-request.interface';

export const CurrentTenant = createParamDecorator(
  (data: unknown, ctx: ExecutionContext): string => {
    const request = ctx.switchToHttp().getRequest<AuthenticatedRequest>();
    const tenantId = request.user?.tenant_id;

    if (!tenantId) {
      throw new UnauthorizedException(
        'Invalid token payload: Missing tenant identity.',
      );
    }

    return tenantId;
  },
);
