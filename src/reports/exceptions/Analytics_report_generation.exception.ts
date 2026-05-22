import { HttpException, HttpStatus } from '@nestjs/common';

export class ReportGenerationException extends HttpException {
  constructor(
    public readonly operation: string,
    public readonly originalError?: unknown,
  ) {
    super(
      {
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
        message: `Failed to execute analytics operation: ${operation}`,
        error: 'Report Generation Failed',
        details:
          originalError instanceof Error
            ? originalError.message
            : 'Unknown error occurred',
      },
      HttpStatus.INTERNAL_SERVER_ERROR,
    );
  }
}
