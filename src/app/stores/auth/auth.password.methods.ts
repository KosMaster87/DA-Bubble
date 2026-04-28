/**
 * @fileoverview Authentication Password Methods
 * @description Methods for password reset and recovery
 * @module AuthPasswordMethods
 */

import { Auth, confirmPasswordReset, sendPasswordResetEmail } from '@angular/fire/auth';

/**
 * Create password methods for auth store
 * @description Factory that isolates password-reset concerns from other auth workflows,
 * keeping the store composition clean and each domain independently testable.
 * @function createPasswordMethods
 * @param {Auth} auth - Firebase Auth instance
 * @returns {object} Password methods
 */
export const createPasswordMethods = (auth: Auth) => ({
  /**
   * Send password reset email
   * @description Delegates directly to Firebase so reset e-mails use Firebase's
   * built-in delivery and link-lifetime guarantees without custom infrastructure.
   * @async
   * @param {string} email - User email address
   */
  async sendPasswordResetEmail(email: string): Promise<void> {
    await sendPasswordResetEmail(auth, email);
  },

  /**
   * Confirm password reset with code
   * @description Finalizes the Firebase password-reset flow so the store is the single
   * entry point for all auth mutations, keeping components free of Firebase imports.
   * @async
   * @param {string} code - Reset code from email
   * @param {string} newPassword - New password
   */
  async confirmPasswordReset(code: string, newPassword: string): Promise<void> {
    await confirmPasswordReset(auth, code, newPassword);
  },
});
