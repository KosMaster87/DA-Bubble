/**
 * @fileoverview Avatar Selection Guard
 * @description Restricts avatar-selection access to authenticated users who completed email verification but still lack an avatar.
 * @module guards/avatar-selection
 */

import { inject } from '@angular/core';
import { Auth } from '@angular/fire/auth';
import { CanActivateFn, Router } from '@angular/router';

/**
 * Guard to protect avatar selection page
 * @description Allows activation only during the onboarding step where avatar selection is still pending.
 * Requires authentication AND email verification
 * @function avatarSelectionGuard
 * @returns {boolean | Promise<boolean>} True if user can access, otherwise redirects
 */
export const avatarSelectionGuard: CanActivateFn = async () => {
  const router = inject(Router);
  const auth = inject(Auth);

  return await checkAvatarSelectionAccess(auth, router);
};

/**
 * Check if user can access avatar selection
 * @description Enforces onboarding order by redirecting users who are unauthenticated, unverified, or already configured.
 * @async
 * @function checkAvatarSelectionAccess
 * @param {Auth} auth - Firebase Auth instance
 * @param {Router} router - Angular router instance
 * @returns {Promise<boolean>} True if can access, false otherwise
 */
async function checkAvatarSelectionAccess(auth: Auth, router: Router): Promise<boolean> {
  const user = auth.currentUser;

  if (!user) {
    router.navigate(['/']);
    return false;
  }

  await user.reload();

  if (!user.emailVerified) {
    router.navigate(['/verify-email']);
    return false;
  }

  if (user.photoURL) {
    router.navigate(['/dashboard']);
    return false;
  }

  return true;
}
