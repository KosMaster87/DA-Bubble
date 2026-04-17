import { describe, expect, it } from 'vitest';
import {
  createErrorState,
  createSuccessState,
  getErrorMessage,
  isFirestoreInternalError,
  isMissingIndexError,
  isPermissionError,
} from './shared-error.helpers';

describe('getErrorMessage', () => {
  it('returns Error.message for Error instances', () => {
    expect(getErrorMessage(new Error('boom'), 'fallback')).toBe('boom');
  });

  it('returns the string directly for string errors', () => {
    expect(getErrorMessage('network error', 'fallback')).toBe('network error');
  });

  it('returns defaultMessage for unknown types', () => {
    expect(getErrorMessage({ code: 7 }, 'fallback')).toBe('fallback');
    expect(getErrorMessage(null, 'fallback')).toBe('fallback');
  });
});

describe('isPermissionError', () => {
  it('returns true for permission-denied code', () => {
    expect(isPermissionError({ code: 'permission-denied' })).toBe(true);
  });

  it('returns true when message includes "permissions"', () => {
    expect(isPermissionError({ message: 'Missing or insufficient permissions' })).toBe(true);
  });

  it('returns false for unrelated errors', () => {
    expect(isPermissionError({ code: 'not-found' })).toBe(false);
    expect(isPermissionError(new Error('unknown'))).toBe(false);
    expect(isPermissionError(null)).toBe(false);
  });
});

describe('isMissingIndexError', () => {
  it('returns true for failed-precondition with index message', () => {
    expect(isMissingIndexError({ code: 'failed-precondition', message: 'requires an index' })).toBe(
      true,
    );
  });

  it('returns false for failed-precondition without index message', () => {
    expect(isMissingIndexError({ code: 'failed-precondition', message: 'other error' })).toBe(
      false,
    );
  });

  it('returns false for non-matching codes', () => {
    expect(isMissingIndexError({ code: 'permission-denied', message: 'index' })).toBe(false);
  });
});

describe('isFirestoreInternalError', () => {
  it('returns true for FIRESTORE INTERNAL ASSERTION FAILED', () => {
    expect(isFirestoreInternalError({ message: 'FIRESTORE INTERNAL ASSERTION FAILED: ...' })).toBe(
      true,
    );
  });

  it('returns true for BloomFilter message', () => {
    expect(isFirestoreInternalError({ message: 'BloomFilter error occurred' })).toBe(true);
  });

  it('returns false for unrelated errors', () => {
    expect(isFirestoreInternalError({ message: 'network timeout' })).toBe(false);
    expect(isFirestoreInternalError(null)).toBe(false);
  });
});

describe('createErrorState', () => {
  it('returns error message and isLoading: false', () => {
    const state = createErrorState(new Error('fail'), 'default');
    expect(state.error).toBe('fail');
    expect(state.isLoading).toBe(false);
  });

  it('uses default message for unknown error types', () => {
    const state = createErrorState({}, 'default msg');
    expect(state.error).toBe('default msg');
  });
});

describe('createSuccessState', () => {
  it('returns null error and isLoading: false', () => {
    const state = createSuccessState();
    expect(state.error).toBeNull();
    expect(state.isLoading).toBe(false);
  });
});
