/**
 * @fileoverview Shared Error Handling Helpers
 * @description Common error handling patterns used across all stores
 * @module stores/helpers/shared
 */

import { ErrorLike } from '../core/store.types';

/**
 * Extract error message from unknown error type
 * @description Normalises the TypeScript unknown error type to a string so store state only ever holds string | null for the error field.
 */
export const getErrorMessage = (error: unknown, defaultMessage: string): string => {
  if (error instanceof Error) return error.message;
  if (typeof error === 'string') return error;
  return defaultMessage;
};

/**
 * Check if error is a permission denied error
 * @description Identifies Firestore permission errors so callers can decide whether to retry or redirect to login.
 */
export const isPermissionError = (error: unknown): boolean => {
  const e = error as ErrorLike;
  return e?.code === 'permission-denied' || e?.message?.includes('permissions') === true;
};

/**
 * Check if error is a Firestore missing-index error
 * @description Detects missing composite-index errors so the app can log a helpful link rather than showing a generic failure.
 */
export const isMissingIndexError = (error: unknown): boolean => {
  const e = error as ErrorLike;
  return e?.code === 'failed-precondition' && e?.message?.includes('index') === true;
};

/**
 * Check if error is a Firestore internal state error
 * @description Detects Firestore SDK internal assertion failures that should be silently swallowed rather than surfaced as user-facing errors.
 */
export const isFirestoreInternalError = (error: unknown): boolean => {
  const e = error as ErrorLike;
  const errorMsg = e?.message ?? '';
  return (
    errorMsg.includes('FIRESTORE INTERNAL ASSERTION FAILED') ||
    errorMsg.includes('Unexpected state') ||
    errorMsg.includes('ca9') ||
    errorMsg.includes('b815') ||
    errorMsg.includes('BloomFilter')
  );
};

/**
 * Log error with context
 * @description Centralises console.error calls with a consistent emoji prefix so store errors are easily identifiable in the browser console.
 */
export const logError = (context: string, error: unknown): void => {
  console.error(`❌ Error in ${context}:`, error);
};

/**
 * Log warning with context
 * @description Centralises console.warn calls for non-fatal conditions so their format matches logError for easier filtering.
 */
export const logWarning = (context: string, message: string): void => {
  console.warn(`⚠️ Warning in ${context}:`, message);
};

/**
 * Create error state object
 * @description Builds the standardised error+isLoading state patch used in every catch block across the stores.
 */
export const createErrorState = (error: unknown, defaultMessage: string) => ({
  error: getErrorMessage(error, defaultMessage),
  isLoading: false,
});

/**
 * Create success state object
 * @description Builds the standardised success state patch that clears error and isLoading after any operation completes.
 */
export const createSuccessState = () => ({
  error: null,
  isLoading: false,
});
