/**
 * @fileoverview Shared Error Handling Helpers
 * @description Common error handling patterns used across all stores
 * @module stores/helpers/shared
 */

/**
 * Extract error message from unknown error type
 */
export const getErrorMessage = (error: unknown, defaultMessage: string): string => {
  if (error instanceof Error) return error.message;
  if (typeof error === 'string') return error;
  return defaultMessage;
};

/**
 * Check if error is a permission denied error
 */
export const isPermissionError = (error: any): boolean =>
  error?.code === 'permission-denied' || error?.message?.includes('permissions');

/**
 * Check if error is a Firestore internal state error
 */
export const isFirestoreInternalError = (error: any): boolean => {
  const errorMsg = error?.message || '';
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
 */
export const logError = (context: string, error: unknown): void => {
  console.error(`❌ Error in ${context}:`, error);
};

/**
 * Log warning with context
 */
export const logWarning = (context: string, message: string): void => {
  console.warn(`⚠️ Warning in ${context}:`, message);
};

/**
 * Create error state object
 */
export const createErrorState = (error: unknown, defaultMessage: string) => ({
  error: getErrorMessage(error, defaultMessage),
  isLoading: false,
  loading: false,
});

/**
 * Create success state object
 */
export const createSuccessState = () => ({
  error: null,
  isLoading: false,
  loading: false,
});
