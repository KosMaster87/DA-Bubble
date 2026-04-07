import { describe, expect, it } from 'vitest';
import {
  getAuthErrorNotificationMessage,
  getInvitationAcceptErrorNotificationMessage,
  notificationCopy,
} from './notification-copy';

describe('notification-copy', () => {
  it('maps known auth codes to user-friendly copy', () => {
    const message = getAuthErrorNotificationMessage(
      { code: 'auth/invalid-credential' },
      notificationCopy.signinFailed,
    );

    expect(message).toBe('Invalid email or password. Please try again.');
  });

  it('falls back to provided default copy for unknown auth errors', () => {
    const message = getAuthErrorNotificationMessage(
      { code: 'auth/some-unknown-code' },
      notificationCopy.signupFailed,
    );

    expect(message).toBe(notificationCopy.signupFailed);
  });

  it('builds invitation acceptance error copy from Error object', () => {
    const message = getInvitationAcceptErrorNotificationMessage(new Error('Permission denied'));

    expect(message).toBe('Error accepting invitation: Permission denied');
  });
});
