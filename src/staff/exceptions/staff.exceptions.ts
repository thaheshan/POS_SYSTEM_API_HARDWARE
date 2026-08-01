import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';

export class StaffAlreadyExistsException extends ConflictException {
  constructor(email?: string) {
    super(
      email
        ? `Staff with email ${email} already exists.`
        : 'Staff already exists.',
    );
  }
}

export class InvalidStaffShopAssociationException extends BadRequestException {
  constructor(
    message = 'Invalid staff or shop association, or staff is not pending approval.',
  ) {
    super(message);
  }
}

export class RegisterStaffException extends InternalServerErrorException {
  constructor(message = 'Failed to create staff account.') {
    super(message);
  }
}

export class ShopOwnerNotFoundException extends NotFoundException {
  constructor(message = 'Shop owner not found for this shop.') {
    super(message);
  }
}

export class NotifyShopOwnerException extends InternalServerErrorException {
  constructor(message = 'Failed to notify shop owner.') {
    super(message);
  }
}

export class StaffNotFoundException extends NotFoundException {
  constructor(id?: string) {
    super(
      id ? `Staff member with ID ${id} not found.` : 'Staff member not found.',
    );
  }
}

export class InvalidStaffActionException extends BadRequestException {
  constructor(message = 'Invalid staff action or invalid staff ID.') {
    super(message);
  }
}

export class UnauthorizedStaffApprovalException extends ForbiddenException {
  constructor(
    message = 'You are not authorized to approve staff for this shop.',
  ) {
    super(message);
  }
}

export class ApproveStaffException extends InternalServerErrorException {
  constructor(message = 'Failed to update staff approval status.') {
    super(message);
  }
}

export class GetStaffStatusException extends InternalServerErrorException {
  constructor(message = 'Failed to retrieve staff status.') {
    super(message);
  }
}
