import { Catch, ArgumentsHost, Logger } from '@nestjs/common';
import { BaseExceptionFilter, HttpAdapterHost } from '@nestjs/core';

@Catch() // no args = catch every exception
export class LoggingExceptionFilter extends BaseExceptionFilter {
  private readonly logger = new Logger(LoggingExceptionFilter.name);

  constructor(httpAdapterHost: HttpAdapterHost) {
    // Pass it to super() so NestJS knows how to send responses back to Postman
    super(httpAdapterHost.httpAdapter);
  }

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const req = ctx.getRequest<Request>();

    // Log stack or message
    if (exception instanceof Error) {
      this.logger.error(`Error on ${req.method} ${req.url}`, exception.stack);
    } else {
      this.logger.error(`Unknown exception on ${req.method} ${req.url}`);
    }

    // Delegate to default filter for HTTP exceptions or generic 500
    super.catch(exception, host);
  }
}
