/**
 * @fileoverview Authentication Guard
 * @description Enforces authenticated and verified access for protected routes before dashboard features are reachable.
 * @module guards/auth
 */

import { inject } from '@angular/core';
import { Auth } from '@angular/fire/auth';
import { CanActivateFn, Router } from '@angular/router';
import { AuthStore } from '@stores/auth';

/**
 * Guard to protect routes that require authentication and email verification
 * @description Blocks route activation until auth state is loaded and verification constraints are satisfied.
 * @function authGuard
 * @returns {boolean | Promise<boolean>} True if user is authenticated and email verified
 */
export const authGuard: CanActivateFn = async () => {
  const router = inject(Router);
  const store = inject(AuthStore);
  const auth = inject(Auth);

  return await checkAuthentication(store, auth, router);
};

/**
 * Check if user is authenticated and email is verified
 * @description Waits for auth-store stabilization, then enforces signin and verification prerequisites.
 * @async
 * @function checkAuthentication
 * @param {InstanceType<typeof AuthStore>} store - Auth store instance
 * @param {Auth} auth - Firebase Auth instance
 * @param {Router} router - Angular router instance
 * @returns {Promise<boolean>} True if authenticated and verified, false otherwise
 */
async function checkAuthentication(
  store: InstanceType<typeof AuthStore>,
  auth: Auth,
  router: Router,
): Promise<boolean> {
  while (store.isLoading()) {
    await new Promise((resolve) => setTimeout(resolve, 50));
  }

  const isAuthenticated = store.isAuthenticated();

  if (!isAuthenticated) {
    router.navigate(['/']);
    return false;
  }

  return await checkEmailVerification(auth, router);
}

/**
 * Check if user's email is verified and has avatar
 * @description Redirects users to required onboarding checkpoints when verification or avatar prerequisites are missing.
 * @async
 * @function checkEmailVerification
 * @param {Auth} auth - Firebase Auth instance
 * @param {Router} router - Angular router instance
 * @returns {Promise<boolean>} True if email verified and has avatar, false otherwise
 */
async function checkEmailVerification(auth: Auth, router: Router): Promise<boolean> {
  const user = auth.currentUser;

  if (!user) {
    router.navigate(['/']);
    return false;
  }

  await user.reload();

  if (!user.emailVerified && !user.isAnonymous) {
    router.navigate(['/verify-email']);
    return false;
  }

  if (!user.photoURL && !user.isAnonymous) {
    router.navigate(['/avatar-selection']);
    return false;
  }

  return true;
}
