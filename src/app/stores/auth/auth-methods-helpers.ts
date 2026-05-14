/**
 * @fileoverview Authentication Methods Helpers
 * @description Re-exports for auth signup, login, logout, guest, and profile helper functions.
 * @module auth-methods-helpers
 */

// Re-export signup helpers
export {
  addSignupUserToDefaultChannels,
  createSignupFirestoreUser,
  sendSignupVerificationEmail,
  updateSignupProfile,
} from '../helpers/auth-signup.helpers';

// Re-export login helpers
export {
  addLoginUserToDefaultChannels,
  createLoginFirestoreUser,
  createLoginNotesDM,
  updateLoginUserStatus,
} from '../helpers/auth-login.helpers';

// Re-export logout and guest helpers
export {
  deleteGuestUserAccount,
  isGuestUser,
  updateLogoutUserStatus,
} from '../helpers/auth-logout-guest.helpers';

// Re-export profile helpers
export { updateExistingUserProfile } from '../helpers/auth-profile.helpers';
