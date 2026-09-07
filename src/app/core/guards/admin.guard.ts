/**
 * @fileoverview Admin Guard
 * @description Restricts route activation to users with the 'admin' or 'owner' role.
 * @module guards/admin
 */

import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthStore } from '@stores/auth';

/**
 * Guard to protect routes that require an admin (or owner) role
 * @description Assumes authGuard already ran for the route tree this is nested under;
 * only checks the role, not authentication itself.
 * @function adminGuard
 * @returns {Promise<boolean>} True if the current user is an admin or owner
 */
export const adminGuard: CanActivateFn = async () => {
  const router = inject(Router);
  const store = inject(AuthStore);

  while (store.isLoading()) {
    await new Promise((resolve) => setTimeout(resolve, 50));
  }

  if (!store.isAdmin()) {
    router.navigate(['/']);
    return false;
  }

  return true;
};
