import { Injectable } from '@angular/core';
import {
  CanActivate,
  ActivatedRouteSnapshot,
  RouterStateSnapshot,
  Router,
} from '@angular/router';
import { AuthorizationService } from '../services/authorization.service';

@Injectable({
  providedIn: 'root',
})
export class PermissionGuard implements CanActivate {
  constructor(
    private authorizationService: AuthorizationService,
    private router: Router
  ) {}

  canActivate(
    route: ActivatedRouteSnapshot,
    _state: RouterStateSnapshot
  ): boolean {
    const requiredPermission = route.data['permission'] as string | undefined;
    const requiredPermissions = route.data['permissions'] as string[] | undefined;
    const requireAll = route.data['requireAll'] as boolean | undefined;

    if (!requiredPermission && !requiredPermissions) {
      return true;
    }

    if (requiredPermission) {
      if (this.authorizationService.hasPermission(requiredPermission)) {
        return true;
      }
    }

    if (requiredPermissions) {
      const hasAccess = requireAll
        ? this.authorizationService.hasAllPermissions(requiredPermissions)
        : this.authorizationService.hasAnyPermission(requiredPermissions);

      if (hasAccess) {
        return true;
      }
    }

    this.router.navigate(['/dashboard']);
    return false;
  }
}
