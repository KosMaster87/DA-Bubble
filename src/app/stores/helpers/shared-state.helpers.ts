/**
 * @fileoverview Shared State Management Helpers
 * @description Common state update patterns used across all stores
 * @module stores/helpers/shared
 */

/**
 * Generic function to update an item in an array by ID
 * @description Immutable update via map so NgRx signal change detection sees a new array reference.
 */
export const updateItemInArray = <T extends { id: string }>(
  items: T[],
  itemId: string,
  updates: Partial<T>,
): T[] => items.map((item) => (item.id === itemId ? { ...item, ...updates } : item));

/**
 * Generic function to remove an item from an array by ID
 * @description Immutable removal via filter to preserve referential integrity for downstream computed signals.
 */
export const removeItemFromArray = <T extends { id: string }>(items: T[], itemId: string): T[] =>
  items.filter((item) => item.id !== itemId);

/**
 * Generic function to add an item to the beginning of an array
 * @description Prepends so the newest item appears at index 0, matching the reverse-chronological display order.
 */
export const prependItem = <T>(items: T[], newItem: T): T[] => [newItem, ...items];

/**
 * Generic function to add an item to the end of an array
 * @description Appends to preserve insertion order for older-messages pagination results.
 */
export const appendItem = <T>(items: T[], newItem: T): T[] => [...items, newItem];

/**
 * Generic function to find an item by ID
 * @description Provides a type-safe lookup returning undefined instead of throwing so callers can use optional chaining.
 */
export const findItemById = <T extends { id: string }>(items: T[], itemId: string): T | undefined =>
  items.find((item) => item.id === itemId);

/**
 * Generic function to check if an item exists by ID
 * @description Uses some() for early exit performance when only existence, not the item itself, is needed.
 */
export const itemExists = <T extends { id: string }>(items: T[], itemId: string): boolean =>
  items.some((item) => item.id === itemId);

/**
 * Generic function to filter items by a predicate
 * @description Thin wrapper kept for consistency so all store array operations follow the same functional helper style.
 */
export const filterItems = <T>(items: T[], predicate: (item: T) => boolean): T[] =>
  items.filter(predicate);

/**
 * Generic function to sort items by a key
 * @description Sorts a copy of the array so the original state slice is never mutated in place.
 */
export const sortItemsBy = <T>(items: T[], key: keyof T, order: 'asc' | 'desc' = 'asc'): T[] => {
  return [...items].sort((a, b) => {
    const aVal = a[key];
    const bVal = b[key];
    if (aVal < bVal) return order === 'asc' ? -1 : 1;
    if (aVal > bVal) return order === 'asc' ? 1 : -1;
    return 0;
  });
};
