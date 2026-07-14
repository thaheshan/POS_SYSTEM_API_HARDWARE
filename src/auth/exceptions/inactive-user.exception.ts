import { ForbiddenException } from '@nestjs/common';

export class InactiveUserException extends ForbiddenException {
  constructor(details: Record<string, unknown> = {}) {
    super({
      ...details,
      message: 'Account is inactive. Please contact support.',
    });
  }
}
