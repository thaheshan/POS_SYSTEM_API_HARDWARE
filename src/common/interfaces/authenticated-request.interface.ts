import type { Request } from 'express';
import type { AuthUser } from 'src/auth/interfaces/auth-user.interface';

export interface AuthenticatedRequest extends Request {
  user: AuthUser;
}