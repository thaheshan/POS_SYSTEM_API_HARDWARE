export interface AuthUser {
  user_id: string;
  email: string;
  role: string;
  status: string;
  is_active: boolean;
  is_verified: boolean;
  tenant_id: string;
  first_name?: string | null;
  last_name?: string | null;
  totp_secret?: string;
  phone_number?: string;
  two_factor_enabled: boolean;
}
