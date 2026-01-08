/**
 * @fileoverview Shared State Management Helpers
 * @description Common state update patterns used across all stores
 * @module stores/helpers/shared
 */

/**
 * Generic function to update an item in an array by ID
 */
export const updateItemInArray = <T extends { id: string }>(
  items: T[],
  itemId: string,
  updates: Partial<T>
): T[] => items.map((item) => (item.id === itemId ? { ...item, ...updates } : item));

/**
 * Generic function to remove an item from an array by ID
 */
export const removeItemFromArray = <T extends { id: string }>(items: T[], itemId: string): T[] =>
  items.filter((item) => item.id !== itemId);

/**
 * Generic function to add an item to the beginning of an array
 */
export const prependItem = <T>(items: T[], newItem: T): T[] => [newItem, ...items];

/**
 * Generic function to add an item to the end of an array
 */
export const appendItem = <T>(items: T[], newItem: T): T[] => [...items, newItem];

/**
 * Generic function to find an item by ID
 */
export const findItemById = <T extends { id: string }>(items: T[], itemId: string): T | undefined =>
  items.find((item) => item.id === itemId);

/**
 * Generic function to check if an item exists by ID
 */
export const itemExists = <T extends { id: string }>(items: T[], itemId: string): boolean =>
  items.some((item) => item.id === itemId);

/**
 * Generic function to filter items by a predicate
 */
export const filterItems = <T>(items: T[], predicate: (item: T) => boolean): T[] =>
  items.filter(predicate);

/**
 * Generic function to sort items by a key
 */
export const sortItemsBy = <T>(
  items: T[],
  key: keyof T,
  order: 'asc' | 'desc' = 'asc'
): T[] => {
  return [...items].sort((a, b) => {
    const aVal = a[key];
    const bVal = b[key];
    if (aVal < bVal) return order === 'asc' ? -1 : 1;
    if (aVal > bVal) return order === 'asc' ? 1 : -1;
    return 0;
  });
};
