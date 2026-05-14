/**
 * @fileoverview Direct message list entry helpers
 * @description Provides pure helper functions for sorting and constructing sidebar-ready direct message list entries.
 * @module direct-message-list
 */

const DEFAULT_DIRECT_MESSAGE_AVATAR = '/img/profile/profile-0.svg';

type SortableDirectMessageListEntry = {
  id: string;
  name: string;
};

type SelfDirectMessageUser = {
  uid: string;
  displayName: string;
  photoURL?: string | null;
};

type SelfDirectMessageListEntry = {
  id: string;
  userId: string;
  name: string;
  avatar: string;
  isOnline: boolean;
  hasUnread: boolean;
  hasThreadUnread: boolean;
  unreadMessageCount: number;
  unreadThreadCount: number;
};

/**
 * Sort direct message list entries alphabetically by display name.
 * @description Ensures direct message entries are ordered deterministically by name so sidebar order stays stable.
 *
 * @param conversations - Unsorted list entries
 * @returns A new alphabetically sorted array
 */
export function sortDirectMessageListEntries<T extends SortableDirectMessageListEntry>(
  conversations: T[],
): T[] {
  return [...conversations].sort((a, b) => a.name.localeCompare(b.name));
}

/**
 * Build the self-DM entry for the sidebar list.
 * @description Ensures the self-DM placeholder exists and reuses existing state when available so personal notes remain discoverable and unread state is preserved.
 *
 * @param currentUser - Current user data used for the self-DM label and avatar
 * @param sortedList - Current conversation list to reuse an existing self-DM entry when available
 * @param selfConversationId - Persisted self-conversation identifier
 * @returns Sidebar-ready self-DM entry
 */
export function buildSelfDirectMessageEntry(
  currentUser: SelfDirectMessageUser,
  sortedList: SelfDirectMessageListEntry[],
  selfConversationId: string,
): SelfDirectMessageListEntry {
  const existingSelfDM = sortedList.find((entry) => entry.id === selfConversationId);

  if (existingSelfDM) {
    return { ...existingSelfDM, name: `${currentUser.displayName} (Notes)` };
  }

  return {
    id: `self-${currentUser.uid}`,
    userId: currentUser.uid,
    name: `${currentUser.displayName} (Notes)`,
    avatar: currentUser.photoURL || DEFAULT_DIRECT_MESSAGE_AVATAR,
    isOnline: true,
    hasUnread: false,
    hasThreadUnread: false,
    unreadMessageCount: 0,
    unreadThreadCount: 0,
  };
}
