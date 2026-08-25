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
    loadComponent: () => import('./pages/patients/patients-list.page').then((m) => m.PatientsListPage),
  },
  {
    path: 'patients/create',
    canActivate: [AuthGuard, PermissionGuard],
    data: { permission: 'patients.create' },
    loadComponent: () => import('./pages/patients/patient-create.page').then((m) => m.PatientCreatePage),
  },
  {
    path: 'facilities/create',
    canActivate: [AuthGuard, PermissionGuard],
    data: { permission: 'patients.create' },
    loadComponent: () => import('./pages/facilities/facility-create.page').then((m) => m.FacilityCreatePage),
  },
  {
    path: 'doctors/create',
    canActivate: [AuthGuard, PermissionGuard],
    data: { permission: 'patients.create' },
    loadComponent: () => import('./pages/doctors/doctor-create.page').then((m) => m.DoctorCreatePage),
  },
  {
    path: 'woundcare',
    canActivate: [AuthGuard, PermissionGuard],
    data: { permission: 'woundcare.view' },
    loadComponent: () => import('./pages/woundcare/woundcare.page').then((m) => m.WoundcarePage),
  },
  {
    path: 'patients/:id',
    canActivate: [AuthGuard, PermissionGuard],
    data: { permission: 'woundcare.view' },
    loadComponent: () => import('./pages/patients/patient-detail.page').then((m) => m.PatientDetailPage),
  },
  {
    path: 'appointments',
    canActivate: [AuthGuard, PermissionGuard],
    data: { permission: 'woundcare.view' },
    loadComponent: () => import('./pages/appointments/appointments.page').then((m) => m.AppointmentsPage),
  },
  {
    path: 'appointments/create',
    canActivate: [AuthGuard, PermissionGuard],
    data: { permission: 'woundcare.view' },
    loadComponent: () => import('./pages/appointments/appointment-create.page').then((m) => m.AppointmentCreatePage),
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
    path: 'orders',
    canActivate: [AuthGuard, PermissionGuard],
    data: { permission: 'orders.view' },
    loadComponent: () => import('./pages/orders/orders-list.page').then((m) => m.OrdersListPage),
  },
  {
    path: 'orders/create',
    canActivate: [AuthGuard, PermissionGuard],
    data: { permission: 'orders.create' },
    loadComponent: () => import('./pages/orders/order-create.page').then((m) => m.OrderCreatePage),
  },
  {
    path: 'profile',
    canActivate: [AuthGuard, PermissionGuard],
    data: { permission: 'profile.view' },
    loadComponent: () => import('./pages/dashboard/dashboard.page').then((m) => m.DashboardPage),
  },
  {
    path: 'my-wound',
    canActivate: [AuthGuard, PermissionGuard],
    data: { permission: 'dashboard.view' },
    loadComponent: () => import('./pages/patient/my-wound/my-wound.page').then((m) => m.MyWoundPage),
  },
  {
    path: 'my-appointments',
    canActivate: [AuthGuard, PermissionGuard],
    data: { permission: 'dashboard.view' },
    loadComponent: () => import('./pages/patient/my-appointments/my-appointments.page').then((m) => m.MyAppointmentsPage),
  },
  {
    path: 'my-documents',
    canActivate: [AuthGuard, PermissionGuard],
    data: { permission: 'documents.view' },
    loadComponent: () => import('./pages/patient/my-documents/my-documents.page').then((m) => m.MyDocumentsPage),
  },
  {
    path: 'consents',
    canActivate: [AuthGuard, PermissionGuard],
    data: { permission: 'documents.view' },
    loadComponent: () => import('./pages/patient/consents/consents.page').then((m) => m.ConsentsPage),
  },
  {
    path: 'symptom-report',
    canActivate: [AuthGuard, PermissionGuard],
    data: { permission: 'dashboard.view' },
    loadComponent: () => import('./pages/patient/symptom-report/symptom-report.page').then((m) => m.SymptomReportPage),
  },
  {
    path: 'message',
    canActivate: [AuthGuard, PermissionGuard],
    data: { permission: 'dashboard.view' },
    loadComponent: () => import('./pages/patient/message-send/message-send.page').then((m) => m.MessageSendPage),
  },
  {
    path: 'admin',
    canActivate: [AuthGuard],
    loadComponent: () => import('./pages/dashboard/dashboard.page').then((m) => m.DashboardPage),
  },
  {
    path: 'admin/users',
    canActivate: [AuthGuard, PermissionGuard],
    data: { permission: 'admin.users.view' },
    loadComponent: () => import('./pages/admin/user-list.page').then((m) => m.UserListPage),
  },
  {
    path: 'admin/users/invite',
    canActivate: [AuthGuard, PermissionGuard],
    data: { permission: 'admin.users.create' },
    loadComponent: () => import('./pages/admin/user-invite.page').then((m) => m.UserInvitePage),
  },
  {
    path: 'admin/roles',
    canActivate: [AuthGuard, PermissionGuard],
    data: { permission: 'admin.roles.view' },
    loadComponent: () => import('./pages/dashboard/dashboard.page').then((m) => m.DashboardPage),
  },
  {
    path: 'admin/permissions',
    canActivate: [AuthGuard, PermissionGuard],
    data: { permission: 'admin.permissions.view' },
    loadComponent: () => import('./pages/dashboard/dashboard.page').then((m) => m.DashboardPage),
  },
  {
    path: 'admin/menu',
    canActivate: [AuthGuard, PermissionGuard],
    data: { permission: 'admin.menu.view' },
    loadComponent: () => import('./pages/dashboard/dashboard.page').then((m) => m.DashboardPage),
  },
  {
    path: 'admin/settings',
    canActivate: [AuthGuard],
    loadComponent: () => import('./pages/dashboard/dashboard.page').then((m) => m.DashboardPage),
  },
  {
    path: 'admin/contracts/create',
    canActivate: [AuthGuard, PermissionGuard],
    data: { permission: 'admin.contracts.create' },
    loadComponent: () => import('./pages/dashboard/dashboard.page').then((m) => m.DashboardPage),
  },
  {
    path: 'admin/reports',
    canActivate: [AuthGuard, PermissionGuard],
    data: { permission: 'admin.reports.view' },
    loadComponent: () => import('./pages/dashboard/dashboard.page').then((m) => m.DashboardPage),
  },
  {
    path: 'admin/termin-wuensche',
    canActivate: [AuthGuard, PermissionGuard],
    data: { permission: 'admin.users.view' },
    loadComponent: () => import('./pages/admin/termin-wuensche/termin-wuensche.page').then((m) => m.TerminWuenschePage),
  },

  {
    path: '',
    redirectTo: 'dashboard',
    pathMatch: 'full',
  },
];
