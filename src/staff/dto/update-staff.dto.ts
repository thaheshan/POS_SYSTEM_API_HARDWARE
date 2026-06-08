import { IsEmail, IsOptional, IsString, IsUUID, Matches } from 'class-validator';
import { regexConstants } from '../../utils/regex.util';

export class UpdateStaffDto {
  @IsString()
  @IsOptional()
  first_name?: string;

  @IsString()
  @IsOptional()
  last_name?: string;

  @IsEmail({}, { message: 'A valid email format is required.' })
  @IsOptional()
  email?: string;

  @IsString()
  @IsOptional()
  @Matches(regexConstants.phoneNumber, {
    message: 'A valid mobile number is required.',
  })
  phone?: string;

  @IsString()
  @IsOptional()
  role_id?: string;
}
