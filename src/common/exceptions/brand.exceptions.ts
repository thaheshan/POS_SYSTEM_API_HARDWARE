import { ConflictException, NotFoundException } from '@nestjs/common';

export class BrandNotFoundException extends NotFoundException {
  constructor(message = 'Brand not found') {
    super(message);
  }
}

export class BrandAlreadyExistsException extends ConflictException {
  constructor(message = 'A brand with this name already exists') {
    super(message);
  }
}
