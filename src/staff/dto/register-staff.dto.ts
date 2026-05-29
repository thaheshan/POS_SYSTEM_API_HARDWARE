import {
  IsEmail,
  IsNotEmpty,
  IsString,
  IsUUID,
  Matches,
} from 'class-validator';
import { IRegisterStaffRequest } from '../interfaces/register-staff.interface';
import { regexConstants } from '../../utils/regex.util';

export class RegisterStaffDto implements IRegisterStaffRequest {
  @IsString()
  @IsNotEmpty({ message: 'Full name is required.' })
  full_name!: string;

  @IsEmail({}, { message: 'A valid email format is required.' })
  @IsNotEmpty({ message: 'Email is required.' })
  email!: string;

  @IsString()
  @Matches(regexConstants.phoneNumber, {
    message: 'A valid mobile number is required.',
  })
  mobile_number!: string;

  @IsUUID('4', { message: 'Shop ID must be a valid UUID v4.' })
  @IsNotEmpty({ message: 'Shop ID is required.' })
  shop_id!: string;

  @IsString()
  @IsNotEmpty({ message: 'Role is required.' })
  role!: string;  // Now a role ID (UUID string)

  @IsString()
  @IsNotEmpty({ message: 'Password is required.' })
  @Matches(regexConstants.password, {
    message:
      'Password must be at least 8 characters long and contain at least one uppercase letter, one lowercase letter, and one number.',
  })
  password!: string;
}
