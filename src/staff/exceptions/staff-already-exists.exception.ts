import { HttpException, HttpStatus } from '@nestjs/common';

export class StaffAlreadyExistsException extends HttpException {
  constructor(email: string) {
    super(
      {
        status: HttpStatus.FORBIDDEN, // Or CONFLICT (409), depending on exact API contract
        error: 'Forbidden',
        message: `A staff member with the email ${email} is already active or registered.`,
      },
      HttpStatus.FORBIDDEN,
    );
  }
}
