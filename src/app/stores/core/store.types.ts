/**
 * @fileoverview Store Type Definitions
 * @description Common interfaces for store cleanup and lifecycle management
 * @module stores/types
 */

/**
 * Interface for stores that support cleanup
 * @description Stores implementing this interface provide a cleanup() method
 * to unsubscribe from listeners and reset state
 */
export interface CleanableStore {
  cleanup(): void;
}

/**
 * Interface for stores that support destroy
 * @description Stores implementing this interface provide a destroy() method
 * to clear all listeners and cleanup resources
 */
export interface DestroyableStore {
  destroy(): void;
}

/**
 * Minimal shape of a Firebase-like error object with optional code and message.
 * Used for permission-denied and other Firestore error checks.
 */
export interface ErrorLike {
  code?: string;
  message?: string;
}
