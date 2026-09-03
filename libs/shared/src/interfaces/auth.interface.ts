export type UserRole = 'USER' | 'MODERATOR' | 'ADMIN';
export type UserStatus = 'ACTIVE' | 'SUSPENDED' | 'DEACTIVATED';

export interface JwtPayload {
  sub: string;
  email: string;
  roles: UserRole[];
}

export interface AuthUserProfile {
  id: string;
  email: string;
  displayName: string;
  bio?: string;
  status: UserStatus;
  roles: UserRole[];
  createdAt: string;
}
