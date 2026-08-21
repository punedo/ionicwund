import { Injectable } from '@angular/core';
import { AuthService } from './auth.service';

@Injectable({
  providedIn: 'root',
})
export class AuthorizationService {
  constructor(private authService: AuthService) {}

  hasPermission(permission: string): boolean {
    const permissions = this.authService.getPermissions();
    if (permissions.includes('*')) {
      return true;
    }
    return permissions.includes(permission);
  }

  hasAnyPermission(permissions: string[]): boolean {
    return permissions.some((p) => this.hasPermission(p));
  }

  hasAllPermissions(permissions: string[]): boolean {
    return permissions.every((p) => this.hasPermission(p));
  }

  hasRole(role: string): boolean {
    const user = this.authService.getCurrentUser();
    if (!user) {
      return false;
    }
    return user.roles.includes(role);
  }

  hasAnyRole(roles: string[]): boolean {
    const user = this.authService.getCurrentUser();
    if (!user) {
      return false;
    }
    return roles.some((r) => user.roles.includes(r));
  }
}
