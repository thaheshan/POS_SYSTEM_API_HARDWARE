import { Role } from '@prisma/client';

export interface IRegisterStaffRequest {
  full_name: string;
  email: string;
  mobile_number: string;
  shop_id: string;
  role: Role;
  password: string;
}

export interface IRegisterStaffResponse {
  message: string;
  staff_id: string;
}
