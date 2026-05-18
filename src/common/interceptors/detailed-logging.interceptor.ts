import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
  StreamableFile, // <-- 1. Import StreamableFile
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
      `Incoming ${method} ${url} - body: ${JSON.stringify(body || {})}`,
    );

    return next.handle().pipe(
      map((data) => {
        const elapsed = Date.now() - now;

        // 2. Safely parse the response data
        let logSafeData = '';

        if (data instanceof StreamableFile) {
          // Prevent circular JSON crash by just logging a placeholder
          logSafeData = '[File Stream]';
        } else {
          // Try to stringify, with a fallback just in case
          try {
            logSafeData = JSON.stringify(data);
          } catch (error) {
            logSafeData = '[Circular or Un-stringifiable Object]';
          }
        }

        this.logger.log(
          `Response ${method} ${url} - ${elapsed}ms - data: ${logSafeData}`,
        );

        // eslint-disable-next-line @typescript-eslint/no-unsafe-return
        return data;
      }),
    );
  }
}
