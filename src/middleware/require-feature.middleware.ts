/**
 * @deprecated Express middleware executes before NestJS Guards, causing `req.user` to be undefined.
 * Use `@RequireFeature('FEATURE_KEY')` decorator and `FeatureGateGuard` instead.
 * 
 * Example usage:
 * ```ts
 * @UseGuards(JwtAuthGuard, FeatureGateGuard)
 * @RequireFeature('DISCOUNTS')
 * @Get('discounts')
 * getDiscounts() {}
 * ```
 */
import { Injectable, NestMiddleware, UnauthorizedException } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

@Injectable()
export class RequireFeatureMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction) {
    throw new UnauthorizedException(
      'RequireFeatureMiddleware is deprecated. Use FeatureGateGuard instead so auth context is populated.',
    );
  }
}
