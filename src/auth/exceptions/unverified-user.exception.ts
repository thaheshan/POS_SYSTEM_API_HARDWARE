import { ForbiddenException } from '@nestjs/common';

export class UnverifiedUserException extends ForbiddenException {
  constructor(details: Record<string, unknown> = {}) {
    super({
      ...details,
      message:
        'Account is not verified. Please check your email to verify your account.',
    });
  }
}
