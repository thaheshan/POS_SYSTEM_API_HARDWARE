import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ExecutionContext } from '@nestjs/common';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  private readonly logger = new Logger('JwtAuthGuard');

  canActivate(context: ExecutionContext) {
    const req = context.switchToHttp().getRequest();
    const authHeader = req.headers['authorization'];
    this.logger.log(`Authorization header present: ${!!authHeader}`);
    if (authHeader) {
      const parts = authHeader.split(' ');
      this.logger.log(`Token type: ${parts[0]}, Token length: ${parts[1]?.length}`);
      this.logger.log(`Token first 30 chars: ${parts[1]?.substring(0, 30)}`);
    }
    return super.canActivate(context);
  }

  handleRequest(err: any, user: any, info: any) {
    this.logger.log(`handleRequest - err: ${err?.message}, user: ${!!user}, info: ${info?.message || info}`);
    if (err || !user) {
      throw err || new UnauthorizedException();
    }
    return user;
  }
}
