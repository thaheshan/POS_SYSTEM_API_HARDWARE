import { Catch, ArgumentsHost, Logger, NotFoundException } from '@nestjs/common';
import { BaseExceptionFilter } from '@nestjs/core';

@Catch()
export class LoggingExceptionFilter extends BaseExceptionFilter {
  private readonly logger = new Logger(LoggingExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const req = ctx.getRequest<{ method: string; url: string }>();

    // Suppress Next.js HMR noise
    if (req.url?.includes('_next')) {
      super.catch(exception, host);
      return;
    }

    // Suppress 404s for unknown routes — not actionable server errors
    if (exception instanceof NotFoundException) {
      super.catch(exception, host);
      return;
    }

    if (exception instanceof Error) {
      this.logger.error(`Error on ${req.method} ${req.url}`, exception.stack);
    } else {
      this.logger.error(`Unknown exception on ${req.method} ${req.url}`);
    }

    super.catch(exception, host);
  }
}
