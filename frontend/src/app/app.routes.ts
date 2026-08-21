import { Routes } from '@angular/router';
import { AuthGuard } from './guards/auth.guard';
import { PermissionGuard } from './guards/permission.guard';

export const routes: Routes = [
  {
    path: 'login',
    loadComponent: () => import('./pages/login/login.page').then((m) => m.LoginPage),
  },
  {
    path: '2fa',
    loadComponent: () => import('./pages/two-factor/two-factor.page').then((m) => m.TwoFactorPage),
  },
  {
    path: 'dashboard',
    canActivate: [AuthGuard, PermissionGuard],
    data: { permission: 'dashboard.view' },
    loadComponent: () => import('./pages/dashboard/dashboard.page').then((m) => m.DashboardPage),
  },
  {
    path: 'patients',
    canActivate: [AuthGuard, PermissionGuard],
    data: { permission: 'patients.view' },
    loadComponent: () => import('./pages/dashboard/dashboard.page').then((m) => m.DashboardPage),
  },
  {
    path: 'patients/create',
    canActivate: [AuthGuard, PermissionGuard],
    data: { permission: 'patients.create' },
    loadComponent: () => import('./pages/dashboard/dashboard.page').then((m) => m.DashboardPage),
  },
  {
    path: 'woundcare',
    canActivate: [AuthGuard, PermissionGuard],
    data: { permission: 'woundcare.view' },
    loadComponent: () => import('./pages/dashboard/dashboard.page').then((m) => m.DashboardPage),
  },
  {
    path: 'documents',
    canActivate: [AuthGuard, PermissionGuard],
    data: { permission: 'documents.view' },
    loadComponent: () => import('./pages/dashboard/dashboard.page').then((m) => m.DashboardPage),
  },
  {
    path: 'products',
    canActivate: [AuthGuard, PermissionGuard],
    data: { permission: 'products.view' },
    loadComponent: () => import('./pages/dashboard/dashboard.page').then((m) => m.DashboardPage),
  },
  {
    path: 'profile',
    canActivate: [AuthGuard, PermissionGuard],
    data: { permission: 'profile.view' },
    loadComponent: () => import('./pages/dashboard/dashboard.page').then((m) => m.DashboardPage),
  },
  {
    path: 'admin',
    canActivate: [AuthGuard],
    data: { permission: null },
    loadComponent: () => import('./pages/dashboard/dashboard.page').then((m) => m.DashboardPage),
  },
  {
    path: '',
    redirectTo: 'dashboard',
    pathMatch: 'full',
  },
];
