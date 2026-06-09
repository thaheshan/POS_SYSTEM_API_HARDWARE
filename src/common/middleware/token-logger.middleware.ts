import { Injectable, NestMiddleware, Logger } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

@Injectable()
export class TokenLoggerMiddleware implements NestMiddleware {
  private logger = new Logger('TokenLogger');
  use(req: Request, res: Response, next: NextFunction) {
    if (req.path.includes('/admin/pending-shops')) {
      this.logger.log(`Incoming request to ${req.path}`);
      this.logger.log(`Authorization Header: ${req.headers['authorization']}`);
    }
    next();
  }
}
