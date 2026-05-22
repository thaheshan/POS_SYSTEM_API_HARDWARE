import { IsEnum, IsNotEmpty, IsUUID } from 'class-validator';

export class ApproveStaffDto {
  @IsUUID('4', { message: 'Staff ID must be a valid UUID v4.' })
  @IsNotEmpty({ message: 'Staff ID is required.' })
  staff_id!: string;

  @IsEnum(['approve', 'reject'], {
    message: 'Action must be either "approve" or "reject".',
  })
  @IsNotEmpty({ message: 'Action is required.' })
  action!: 'approve' | 'reject';
}
