import { ForbiddenException } from '@nestjs/common';

export class LockedAccountException extends ForbiddenException {
  constructor(unlockTime: string) {
    super(
      `Account is temporarily locked. Please try again after ${unlockTime}.`,
    );
  }
}
