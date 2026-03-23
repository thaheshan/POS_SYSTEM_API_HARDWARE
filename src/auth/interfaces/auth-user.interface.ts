export interface AuthUser {
  user_id: string;
  email: string;
  role: string;
  is_active: boolean;
  is_verified: boolean;
  tenant_id: string;
}
