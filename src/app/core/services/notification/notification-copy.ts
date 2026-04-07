/**
 * Shared notification copy and lightweight error-code mapping.
 */

interface CodedError {
  code?: string;
}

export const notificationCopy = {
  signinFailed: 'Sign-in failed. Please check your credentials and try again.',
  signupFailed: 'Sign-up failed. Please try again in a moment.',
  signupSuccess: 'Account created. Please verify your email to continue.',
  verifyEmailPending: 'Please verify your email first by clicking the link in your inbox.',
  verifyEmailCheckFailed: 'Unable to check verification right now. Please try again.',
  verifyEmailResent: 'Verification email sent. Please check your inbox.',
  verifyEmailResendFailed: 'Failed to resend verification email. Please try again.',
  invitationAcceptFailedPrefix: 'Error accepting invitation:',
  pwaInstallUnavailable: 'Installation was already completed or is currently unavailable.',
} as const;

const AUTH_ERROR_MESSAGES: Record<string, string> = {
  'auth/invalid-credential': 'Invalid email or password. Please try again.',
  'auth/user-not-found': 'No account found for this email address.',
  'auth/wrong-password': 'Invalid email or password. Please try again.',
  'auth/too-many-requests': 'Too many attempts. Please wait a moment and try again.',
  'auth/network-request-failed': 'Network error. Please check your connection and try again.',
  'auth/email-already-in-use': 'This email address is already in use.',
};

/**
 * Resolve user-facing auth error copy with fallback.
 */
export const getAuthErrorNotificationMessage = (error: unknown, fallback: string): string => {
  const code = (error as CodedError | null)?.code;
  return (code && AUTH_ERROR_MESSAGES[code]) || fallback;
};

/**
 * Resolve invitation acceptance error copy.
 */
export const getInvitationAcceptErrorNotificationMessage = (error: unknown): string => {
  const message =
    error instanceof Error ? error.message : (error as { message?: string } | null)?.message;
  return `${notificationCopy.invitationAcceptFailedPrefix} ${message || 'Unknown error'}`;
};
