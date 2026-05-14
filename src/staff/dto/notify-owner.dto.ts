import { IsNotEmpty, IsUUID } from 'class-validator';

export class NotifyOwnerDto {
  @IsUUID('4', { message: 'Staff ID must be a valid UUID v4.' })
  @IsNotEmpty({ message: 'Staff ID is required.' })
  staff_id!: string;

  @IsUUID('4', { message: 'Shop ID must be a valid UUID v4.' })
  @IsNotEmpty({ message: 'Shop ID is required.' })
  shop_id!: string;
}
