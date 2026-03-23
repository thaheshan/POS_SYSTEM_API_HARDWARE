import { ForbiddenException } from '@nestjs/common';

export class InactiveUserException extends ForbiddenException {
  constructor() {
    super('Account is inactive. Please contact support.');
  }
}
