import { HttpException, HttpStatus } from '@nestjs/common';

export class TenantIdRequiredException extends HttpException {
  constructor() {
    super('TENANT_ID_REQUIRED', HttpStatus.BAD_REQUEST);
  }
}

export class InvalidCategoryException extends HttpException {
  constructor() {
    super('INVALID_CATEGORY', HttpStatus.BAD_REQUEST);
  }
}

export class VariantsRequiredException extends HttpException {
  constructor() {
    super('VARIANTS_REQUIRED', HttpStatus.BAD_REQUEST);
  }
}

export class ProductNotFoundException extends HttpException {
  constructor() {
    super('PRODUCT_NOT_FOUND', HttpStatus.NOT_FOUND);
  }
}

export class BarcodeNotFoundException extends HttpException {
  constructor() {
    super('BARCODE_NOT_FOUND', HttpStatus.NOT_FOUND);
  }
}

export class SkuNotFoundException extends HttpException {
  constructor() {
    super('SKU_NOT_FOUND', HttpStatus.NOT_FOUND);
  }
}

export class DuplicateBarcodeException extends HttpException {
  constructor() {
    super('DUPLICATE_BARCODE', HttpStatus.CONFLICT);
  }
}

export class DuplicateSkuException extends HttpException {
  constructor() {
    super('DUPLICATE_SKU', HttpStatus.CONFLICT);
  }
}

export class DuplicateValueException extends HttpException {
  constructor() {
    super('DUPLICATE_VALUE', HttpStatus.CONFLICT);
  }
}
