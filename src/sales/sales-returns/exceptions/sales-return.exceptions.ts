import { BadRequestException, NotFoundException } from '@nestjs/common';

export class InvoiceNotFoundException extends NotFoundException {
  constructor(invoiceId: string) {
    super(`Invoice with ID ${invoiceId} was not found.`, {
      description: 'ERROR_INVOICE_NOT_FOUND',
    });
  }
}

export class SalesReturnNotFoundException extends NotFoundException {
  constructor(returnId: string) {
    super(`Sales Return with ID ${returnId} was not found.`, {
      description: 'ERROR_RETURN_NOT_FOUND',
    });
  }
}

export class InvoiceItemNotFoundException extends BadRequestException {
  constructor(itemId: string) {
    super(`Item with ID ${itemId} does not exist in the original invoice.`, {
      description: 'ERROR_INVALID_INVOICE_ITEM',
    });
  }
}

export class ReturnQuantityExceededException extends BadRequestException {
  constructor(productId: string) {
    super(
      `Cannot return more than originally purchased for product ${productId}.`,
      {
        description: 'ERROR_QUANTITY_EXCEEDED',
      },
    );
  }
}

export class InvalidReturnStatusException extends BadRequestException {
  constructor(currentStatus: string) {
    super(
      `Cannot process return. Current status is ${currentStatus}, but must be PENDING.`,
      {
        description: 'ERROR_INVALID_RETURN_STATUS',
      },
    );
  }
}
