import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

@Injectable()
export class DetailedLoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger('HTTP');

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const ctx = context.switchToHttp();
    const req = ctx.getRequest<Request>();
    const { method, url, body } = req;
    const now = Date.now();

    this.logger.log(
      `Incoming ${method} ${url} - body: ${JSON.stringify(body)}`,
    );

    return next.handle().pipe(
      map((data) => {
        const elapsed = Date.now() - now;
        this.logger.log(
          `Response ${method} ${url} - ${elapsed}ms - data: ${JSON.stringify(data)}`,
        );
        // eslint-disable-next-line @typescript-eslint/no-unsafe-return
        return data;
      }),
    );
  }
}
