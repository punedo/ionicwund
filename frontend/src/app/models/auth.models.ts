export interface User {
  id: number;
  email: string;
  roles: string[];
  firstName?: string | null;
  lastName?: string | null;
  twoFactorEnabled: boolean;
  emailVerified: boolean;
}

export interface MenuItem {
  id: string;
  label: string;
  icon?: string | null;
  route?: string | null;
  permission?: string | null;
  sortOrder: number;
  children: MenuItem[];
}

export interface AuthResponse {
  status: 'authenticated' | '2fa_required' | 'error';
  requires2fa: boolean;
  accessToken?: string;
  refreshToken?: string;
  tokenType?: string;
  expiresIn?: number;
  challengeId?: number;
  user?: User;
  permissions?: string[];
  menu?: MenuItem[];
}

export interface TwoFactorRequiredResponse {
  status: '2fa_required';
  requires2fa: true;
  challengeId: number;
  expiresIn: number;
}

export interface ErrorResponse {
  status: 'error';
  code: string;
  message: string;
}

export interface MeResponse {
  user: User;
  permissions: string[];
  menu: MenuItem[];
}
