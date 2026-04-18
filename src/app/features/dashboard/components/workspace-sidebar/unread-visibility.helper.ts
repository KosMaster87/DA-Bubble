/**
 * @fileoverview Unread count visibility helpers
 * @description Rules for showing/hiding unread badges based on active state
 * @module features/dashboard/components/workspace-sidebar
 */

/**
 * Calculate visible unread message count.
 *
 * Returns 0 when the item is currently active, otherwise returns the raw count.
 * This is a presentation-layer rule: the unread state is always real in the service,
 * but the UI only hides badges for the item the user just opened.
 *
 * @param unreadMessageCount - Raw unread message count from service
 * @param isActive - Whether this item is currently selected
 * @returns Count to display in the UI
 * @description
 * Message badges are suppressed for the active item to avoid showing a "new message" signal
 * while the user is already reading that conversation row.
 */
export function getVisibleUnreadMessageCount(
  unreadMessageCount: number,
  isActive: boolean,
): number {
  return isActive ? 0 : unreadMessageCount;
}

/**
 * Calculate visible unread thread count.
 *
 * Thread unread state must remain visible even when the DM row is active.
 * Opening a DM does not mean the user has opened its unread thread yet.
 *
 * @param unreadThreadCount - Raw unread thread count from service
 * @param isActive - Whether this item is currently selected
 * @returns Count to display in the UI
 * @description
 * Thread badges stay visible even when active, because users can be inside a conversation
 * without opening the specific unread thread.
 */
export function getVisibleUnreadThreadCount(unreadThreadCount: number, isActive: boolean): number {
  return unreadThreadCount;
}

/**
 * Determine if an item should render its unread badges.
 *
 * Badges render only if either message count or thread count is > 0
 * after applying visibility rules.
 *
 * @param visibleUnreadMessageCount - Visible message count (after suppression)
 * @param visibleUnreadThreadCount - Visible thread count (after suppression)
 * @returns True if any badges should render
 */
export function shouldRenderUnreadBadges(
  visibleUnreadMessageCount: number,
  visibleUnreadThreadCount: number,
): boolean {
  return visibleUnreadMessageCount > 0 || visibleUnreadThreadCount > 0;
}

/**
 * Format badge count with upper limit cap.
 *
 * @param count - Raw count to format
 * @param maxValue - Upper limit for display (e.g., 99)
 * @returns Formatted string (e.g., "4" or "99+")
 * @description
 * Capping avoids layout jitter and over-wide badges while still signaling large backlogs.
 */
export function formatBadgeCount(count: number, maxValue: number = 99): string {
  return count > maxValue ? `${maxValue}+` : `${count}`;
}
