import { HttpException, HttpStatus } from '@nestjs/common';

export class CategoryNotFoundException extends HttpException {
  constructor(message = 'Category not found') {
    super(message, HttpStatus.NOT_FOUND);
  }
}

export class CategorySelfParentException extends HttpException {
  constructor(message = 'A category cannot be its own parent') {
    super(message, HttpStatus.BAD_REQUEST);
  }
}

export class CategoryDepthLimitExceededException extends HttpException {
  constructor(message = 'CATEGORY_DEPTH_LIMIT_EXCEEDED') {
    super(message, HttpStatus.BAD_REQUEST);
  }
}
export class CategoryConflictException extends HttpException {
  constructor(message = 'Conflict: Category operation failed') {
    super({ success: false, message }, HttpStatus.CONFLICT);
  }
}

export class CategoryDeleteConflictException extends HttpException {
  constructor(message = 'Cannot delete category with active child categories') {
    super({ success: false, message }, HttpStatus.CONFLICT);
  }
}
