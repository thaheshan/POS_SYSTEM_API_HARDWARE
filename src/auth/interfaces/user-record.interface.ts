export interface UserRecord {
  user_id: string;
  email: string;
  password_hash: string;
  first_name: string | null;
  last_name: string | null;
  role: string;
  status: string;
  is_active: boolean;
  is_verified: boolean;
  tenant_id: string;
  failed_login_attempts: number;
  account_locked_until: Date | null;
  totp_secret?: string;
  phone_number?: string;
  two_factor_enabled: boolean;
}
