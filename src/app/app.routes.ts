/**
 * @fileoverview Application routing configuration.
 * @description This file defines the routing configuration for the DABubble application.
 * @module AppRoutes
 */

import { Routes } from '@angular/router';
import { authGuard } from '@core/guards/auth.guard';
import { noAuthGuard } from '@core/guards/no-auth.guard';
import { avatarSelectionGuard } from '@core/guards/avatar-selection.guard';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./layout/auth-layout/auth-layout.component').then((m) => m.AuthLayoutComponent),
    children: [
      {
        path: '',
        loadComponent: () =>
          import('./features/auth/pages/signin/signin.component').then((m) => m.SigninComponent),
        canActivate: [noAuthGuard],
      },
      {
        path: 'signup',
        loadComponent: () =>
          import('./features/auth/pages/signup/signup.component').then((m) => m.SignupComponent),
        canActivate: [noAuthGuard],
      },
      {
        path: 'forgot-password',
        loadComponent: () =>
          import('./features/auth/pages/password-forgot/password-forgot.component').then(
            (m) => m.PasswordForgotComponent,
          ),
        canActivate: [noAuthGuard],
      },
      {
        path: 'reset-password',
        loadComponent: () =>
          import('./features/auth/pages/password-restore/password-restore.component').then(
            (m) => m.PasswordRestoreComponent,
          ),
        // No guard - needs oobCode from email link
      },
      {
        path: 'verify-email',
        loadComponent: () =>
          import('./features/auth/pages/verify-email/verify-email.component').then(
            (m) => m.VerifyEmailComponent,
          ),
        // No guard - needed after signup
      },
      {
        path: 'avatar-selection',
        loadComponent: () =>
          import('./features/auth/pages/avatar-selection/avatar-selection.component').then(
            (m) => m.AvatarSelectionComponent,
          ),
        canActivate: [avatarSelectionGuard],
      },
      // Legal Pages (accessible for everyone)
      {
        path: 'imprint',
        loadComponent: () =>
          import('./features/legal/pages/imprint/imprint.component').then(
            (m) => m.ImprintComponent,
          ),
      },
      {
        path: 'privacy-policy',
        loadComponent: () =>
          import('./features/legal/pages/privacy-policy/privacy-policy.component').then(
            (m) => m.PrivacyPolicyComponent,
          ),
      },
      // 404 Page (accessible for everyone)
      {
        path: 'not-found',
        loadComponent: () =>
          import('./features/auth/pages/not-found/not-found.component').then(
            (m) => m.NotFoundComponent,
          ),
      },
    ],
  },

  // Protected Routes (require authentication)
  // Note: All dashboard routes use same component instance (no children, just parameter variants)
  {
    path: 'dashboard',
    loadComponent: () =>
      import('./features/dashboard/pages/main/dashboard.component').then(
        (m) => m.DashboardComponent,
      ),
    canActivate: [authGuard],
  },
  {
    path: 'dashboard/channel/:id',
    loadComponent: () =>
      import('./features/dashboard/pages/main/dashboard.component').then(
        (m) => m.DashboardComponent,
      ),
    canActivate: [authGuard],
  },
  {
    path: 'dashboard/channel/:id/thread/:threadId',
    loadComponent: () =>
      import('./features/dashboard/pages/main/dashboard.component').then(
        (m) => m.DashboardComponent,
      ),
    canActivate: [authGuard],
  },
  {
    path: 'dashboard/dm/:id',
    loadComponent: () =>
      import('./features/dashboard/pages/main/dashboard.component').then(
        (m) => m.DashboardComponent,
      ),
    canActivate: [authGuard],
  },
  {
    path: 'dashboard/dm/:id/thread/:threadId',
    loadComponent: () =>
      import('./features/dashboard/pages/main/dashboard.component').then(
        (m) => m.DashboardComponent,
      ),
    canActivate: [authGuard],
  },
  {
    path: 'dashboard/mailbox',
    loadComponent: () =>
      import('./features/dashboard/pages/main/dashboard.component').then(
        (m) => m.DashboardComponent,
      ),
    canActivate: [authGuard],
  },
  {
    path: 'dashboard/new-message',
    loadComponent: () =>
      import('./features/dashboard/pages/main/dashboard.component').then(
        (m) => m.DashboardComponent,
      ),
    canActivate: [authGuard],
  },
  {
    path: 'dashboard/legal',
    loadComponent: () =>
      import('./features/dashboard/pages/main/dashboard.component').then(
        (m) => m.DashboardComponent,
      ),
    canActivate: [authGuard],
  },
  {
    path: 'dashboard/settings',
    loadComponent: () =>
      import('./features/dashboard/pages/main/dashboard.component').then(
        (m) => m.DashboardComponent,
      ),
    canActivate: [authGuard],
  },

  // Wildcard - catch all unknown routes
  { path: '**', redirectTo: '/not-found' },
];
