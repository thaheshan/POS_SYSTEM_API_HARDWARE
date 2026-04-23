import { ForbiddenException } from '@nestjs/common';

export class UnverifiedUserException extends ForbiddenException {
  constructor() {
    super(
      'Account is not verified. Please check your email to verify your account.',
    );
  }
}
