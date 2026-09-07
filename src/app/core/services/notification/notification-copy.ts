/**
 * Central registry of notification translation keys.
 * @description Each value is a dot-notation key into the i18n translations map
 * (e.g. 'NOTIFICATIONS.SIGNIN_SUCCESS_EMAIL'). This keeps notification call sites
 * type-discoverable via IDE autocomplete while the actual strings live in one place:
 * core/services/i18n/translations.ts.
 */

export const NOTIFICATION_COPY = {
  AUTH: {
    FORM_INVALID: 'NOTIFICATIONS.AUTH_FORM_INVALID',
    SIGNIN_SUCCESS_EMAIL: 'NOTIFICATIONS.SIGNIN_SUCCESS_EMAIL',
    SIGNIN_SUCCESS_GOOGLE: 'NOTIFICATIONS.SIGNIN_SUCCESS_GOOGLE',
    SIGNIN_SUCCESS_GUEST: 'NOTIFICATIONS.SIGNIN_SUCCESS_GUEST',
    SIGNED_OUT_INFO: 'NOTIFICATIONS.SIGNED_OUT_INFO',
    SIGNIN_FAILED: 'NOTIFICATIONS.SIGNIN_FAILED',
    SIGNUP_FAILED: 'NOTIFICATIONS.SIGNUP_FAILED',
    SIGNUP_SUCCESS: 'NOTIFICATIONS.SIGNUP_SUCCESS',
    VERIFY_EMAIL_PENDING: 'NOTIFICATIONS.VERIFY_EMAIL_PENDING',
    VERIFY_EMAIL_CHECK_FAILED: 'NOTIFICATIONS.VERIFY_EMAIL_CHECK_FAILED',
    VERIFY_EMAIL_RESENT: 'NOTIFICATIONS.VERIFY_EMAIL_RESENT',
    VERIFY_EMAIL_RESEND_FAILED: 'NOTIFICATIONS.VERIFY_EMAIL_RESEND_FAILED',
  },
  INVITATION: {
    ACCEPT_FAILED_PREFIX: 'NOTIFICATIONS.INVITATION_ACCEPT_FAILED_PREFIX',
  },
  PWA: {
    INSTALL_UNAVAILABLE: 'NOTIFICATIONS.PWA_INSTALL_UNAVAILABLE',
  },
  MAILBOX: {
    MESSAGE_SENT: 'NOTIFICATIONS.MAILBOX_MESSAGE_SENT',
    MESSAGE_DELETED: 'NOTIFICATIONS.MAILBOX_MESSAGE_DELETED',
    MARK_ALL_READ: 'NOTIFICATIONS.MAILBOX_MARK_ALL_READ',
  },
} as const;

interface CodedError {
  code?: string;
}

const AUTH_ERROR_KEYS: Record<string, string> = {
  'auth/invalid-credential': 'ERRORS.INVALID_CREDENTIAL',
  'auth/user-not-found': 'ERRORS.USER_NOT_FOUND',
  'auth/wrong-password': 'ERRORS.INVALID_CREDENTIAL',
  'auth/too-many-requests': 'ERRORS.TOO_MANY_REQUESTS',
  'auth/network-request-failed': 'ERRORS.NETWORK',
  'auth/email-already-in-use': 'ERRORS.EMAIL_IN_USE',
};

/**
 * Resolve a Firebase auth error code to a translation key.
 * Falls back to the provided fallback key if the code is unknown.
 */
export const getAuthErrorNotificationKey = (error: unknown, fallback: string): string => {
  const code = (error as CodedError | null)?.code;
  return (code && AUTH_ERROR_KEYS[code]) || fallback;
};

/**
 * Resolve an invitation acceptance error to a display string.
 * This one returns a raw concatenated string (not a key) because it includes
 * a dynamic runtime message appended to the prefix.
 */
export const getInvitationAcceptErrorMessage = (error: unknown): string => {
  const key = NOTIFICATION_COPY.INVITATION.ACCEPT_FAILED_PREFIX;
  const rawPrefix = key; // callers should resolve this via I18nService.t(key)
  const message =
    error instanceof Error ? error.message : (error as { message?: string } | null)?.message;
  return `${rawPrefix} ${message || 'Unknown error'}`;
};

/**
 * Legacy flat copy kept for backward compatibility during migration.
 * @deprecated Use NOTIFICATION_COPY registry + I18nService.t() instead.
 */
export const notificationCopy = {
  authFormInvalid: 'NOTIFICATIONS.AUTH_FORM_INVALID',
  signinSuccessEmail: 'NOTIFICATIONS.SIGNIN_SUCCESS_EMAIL',
  signinSuccessGoogle: 'NOTIFICATIONS.SIGNIN_SUCCESS_GOOGLE',
  signinSuccessGuest: 'NOTIFICATIONS.SIGNIN_SUCCESS_GUEST',
  signedOutInfo: 'NOTIFICATIONS.SIGNED_OUT_INFO',
  signinFailed: 'NOTIFICATIONS.SIGNIN_FAILED',
  signupFailed: 'NOTIFICATIONS.SIGNUP_FAILED',
  signupSuccess: 'NOTIFICATIONS.SIGNUP_SUCCESS',
  verifyEmailPending: 'NOTIFICATIONS.VERIFY_EMAIL_PENDING',
  verifyEmailCheckFailed: 'NOTIFICATIONS.VERIFY_EMAIL_CHECK_FAILED',
  verifyEmailResent: 'NOTIFICATIONS.VERIFY_EMAIL_RESENT',
  verifyEmailResendFailed: 'NOTIFICATIONS.VERIFY_EMAIL_RESEND_FAILED',
  invitationAcceptFailedPrefix: 'NOTIFICATIONS.INVITATION_ACCEPT_FAILED_PREFIX',
  pwaInstallUnavailable: 'NOTIFICATIONS.PWA_INSTALL_UNAVAILABLE',
} as const;

/**
 * Legacy auth error resolver kept for backward compatibility.
 * @deprecated Use getAuthErrorNotificationKey() + I18nService.t() instead.
 */
export const getAuthErrorNotificationMessage = (error: unknown, fallback: string): string => {
  const code = (error as CodedError | null)?.code;
  return (code && AUTH_ERROR_KEYS[code]) || fallback;
};

/**
 * Legacy invitation error resolver kept for backward compatibility.
 * @deprecated Use getInvitationAcceptErrorMessage() + I18nService.t() instead.
 */
export const getInvitationAcceptErrorNotificationMessage = (error: unknown): string => {
  const message =
    error instanceof Error ? error.message : (error as { message?: string } | null)?.message;
  return `${NOTIFICATION_COPY.INVITATION.ACCEPT_FAILED_PREFIX} ${message || 'Unknown error'}`;
};
