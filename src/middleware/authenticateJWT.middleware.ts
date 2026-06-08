import { Injectable, NestMiddleware, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Request, Response, NextFunction } from 'express';
import { UserService } from '../user/user.service';

@Injectable()
export class AuthenticateJWTMiddleware implements NestMiddleware {
  constructor(
    private readonly jwtService: JwtService,
    private readonly userService: UserService,
  ) {}

  async use(req: Request, res: Response, next: NextFunction) {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedException('Missing or invalid token');
    }

    const token = authHeader.substring(7);
    try {
      const payload = await this.jwtService.verifyAsync(token);
      const user = await this.userService.findById(payload.sub);
      if (!user) {
        throw new UnauthorizedException('User not found');
      }

      // Attach to req
      (req as any).user = {
        user_id: user.user_id,
        tenant_id: user.tenant_id,
        role: user.role,
        branch_id: payload.branch_id || null, // Assuming branch_id in payload if needed
      };

      // Set tenant DB context (placeholder, implement as per your multi-tenant setup)
      // e.g., set connection based on tenant_id

      next();
    } catch (error: unknown) {
      if (error instanceof Error && error.name === 'TokenExpiredError') {
        throw new UnauthorizedException('TOKEN_EXPIRED');
      }
      throw new UnauthorizedException('Invalid token');
    }
  }
}