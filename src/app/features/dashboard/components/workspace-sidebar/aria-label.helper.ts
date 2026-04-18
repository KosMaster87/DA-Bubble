/**
 * @fileoverview ARIA label builder for sidebar items
 * @description Accessible label generation for channels, DMs, and system controls
 * @module features/dashboard/components/workspace-sidebar
 */

/**
 * Build ARIA label suffix with unread count details.
 *
 * Generates a localized, accessible description of unread messages and threads.
 * Examples:
 * - "4 unread messages"
 * - "4 unread messages, 2 unread threads"
 * - ""
 *
 * @param unreadMessageCount - Number of unread normal messages
 * @param unreadThreadCount - Number of parent messages with unread threads
 * @returns Comma-separated unread summary, empty string if nothing unread
 * @description
 * Shared suffix generation prevents accessibility copy from diverging between channel and
 * DM rows when unread semantics evolve.
 */
export function buildUnreadAriaSuffix(
  unreadMessageCount: number,
  unreadThreadCount: number,
): string {
  const parts: string[] = [];

  if (unreadMessageCount > 0) {
    parts.push(`${unreadMessageCount} unread message${unreadMessageCount === 1 ? '' : 's'}`);
  }

  if (unreadThreadCount > 0) {
    parts.push(`${unreadThreadCount} unread thread${unreadThreadCount === 1 ? '' : 's'}`);
  }

  if (parts.length === 0) return '';
  return `, ${parts.join(', ')}`;
}

/**
 * Build ARIA label for channel item.
 *
 * @param channelName - Display name of the channel
 * @param unreadMessageCount - Number of unread messages
 * @param unreadThreadCount - Number of unread thread replies
 * @returns Full accessible label
 * @description
 * Channel labels include the same unread dimensions as visual badges so keyboard and
 * screen-reader users receive equivalent state.
 */
export function buildChannelAriaLabel(
  channelName: string,
  unreadMessageCount: number,
  unreadThreadCount: number,
): string {
  return `${channelName}${buildUnreadAriaSuffix(unreadMessageCount, unreadThreadCount)}`;
}

/**
 * Build ARIA label for direct message item.
 *
 * @param dmName - Display name of the DM conversation
 * @param unreadMessageCount - Number of unread messages
 * @param unreadThreadCount - Number of unread thread replies
 * @returns Full accessible label
 * @description
 * DM labels intentionally mirror channel labeling rules to reduce cognitive switching
 * in assistive technology flows.
 */
export function buildDirectMessageAriaLabel(
  dmName: string,
  unreadMessageCount: number,
  unreadThreadCount: number,
): string {
  return `${dmName}${buildUnreadAriaSuffix(unreadMessageCount, unreadThreadCount)}`;
}

/**
 * Build ARIA label for mailbox item.
 *
 * @param unreadCount - Number of unread mailbox items
 * @returns Full accessible label (e.g., "Mailbox, 3 unread items")
 * @description
 * Mailbox uses count-only suffix because it has a single unread dimension, unlike
 * channel/DM rows with split message and thread signals.
 */
export function buildMailboxAriaLabel(unreadCount: number): string {
  if (unreadCount <= 0) return 'Mailbox';
  return `Mailbox, ${unreadCount} unread item${unreadCount === 1 ? '' : 's'}`;
}
