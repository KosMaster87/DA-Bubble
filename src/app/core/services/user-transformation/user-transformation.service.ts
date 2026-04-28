/**
 * @fileoverview User Transformation Service
 * @description Normalizes user and message models into view-specific shapes so UI components can consume consistent contracts.
 * @module core/services/user-transformation
 */

import { computed, inject, Injectable, Signal } from '@angular/core';
import type { DirectMessage } from '@core/models/direct-message.model';
import type { Message as PopupMessage } from '@core/models/message.model';
import type { Message as ViewMessage } from '@shared/dashboard-components/conversation-messages/conversation-messages.component';
import type { EditProfileUser } from '@shared/dashboard-components/profile-edit/profile-edit.component';
import type { ProfileUser } from '@shared/dashboard-components/profile-view/profile-view.component';
import { AuthStore } from '@stores/auth';
import { ChannelMessageStore } from '@stores/channels/channel-message.store';
import { DirectMessageStore } from '@stores/direct-messages/direct-message.store';
import { UserStore } from '@stores/index';
import type { ThreadMessage } from '@stores/threads/thread.store';

export interface UserListItem {
  id: string;
  name: string;
  avatar: string;
}

@Injectable({
  providedIn: 'root',
})
export class UserTransformationService {
  private userStore = inject(UserStore);
  private authStore = inject(AuthStore);
  private channelMessageStore = inject(ChannelMessageStore);
  private directMessageStore = inject(DirectMessageStore);

  /**
   * Transform user to ProfileUser format
   * @description Maps the internal User model to the ProfileUser view-model so profile display components remain decoupled from the store shape.
   * @param {string | null} userId - User ID to transform
   * @returns {ProfileUser | null} Transformed profile user or null if user not found
   */
  toProfileUser = (userId: string | null): ProfileUser | null => {
    if (!userId) return null;

    const user = this.userStore.getUserById()(userId);
    if (!user) return null;

    return {
      id: user.uid,
      displayName: user.displayName,
      email: user.email,
      photoURL: user.photoURL || '/img/profile/profile-0.svg',
      status: user.isOnline ? 'online' : 'offline',
      isAdmin: false,
    };
  };

  /**
   * Transform user to EditProfileUser format
   * @description Strips status and admin read-only fields so the edit form only receives mutable properties.
   * @param {string | null} userId - User ID to transform
   * @returns {EditProfileUser | null} Transformed edit profile user or null if user not found
   */
  toEditProfileUser = (userId: string | null): EditProfileUser | null => {
    if (!userId) return null;

    const user = this.userStore.getUserById()(userId);
    if (!user) return null;

    return {
      id: user.uid,
      displayName: user.displayName,
      email: user.email,
      photoURL: user.photoURL || '/img/profile/profile-0.svg',
      isAdmin: false,
    };
  };

  /**
   * Transform PopupMessage to ViewMessage format
   * @description Resolves the author's display name and avatar from the user store so conversation components receive a self-contained view-model.
   * @param {PopupMessage} message - PopupMessage from store or model
   * @returns {ViewMessage} ViewMessage for conversation components
   */
  popupMessageToViewMessage = (message: PopupMessage): ViewMessage => {
    const user = this.userStore.users().find((u) => u.uid === message.authorId);
    const currentUserId = this.authStore.user()?.uid;

    return {
      id: message.id,
      senderId: message.authorId,
      senderName: user?.displayName || 'Unknown',
      senderAvatar: user?.photoURL || '/img/profile/profile-0.svg',
      content: message.content,
      timestamp: message.createdAt,
      isOwnMessage: message.authorId === currentUserId,
      reactions: message.reactions,
      threadCount: message.threadCount,
      lastThreadTimestamp: message.lastThreadTimestamp,
      isEdited: message.isEdited,
      editedAt: message.editedAt,
    };
  };

  /**
   * Transform ThreadMessages to ViewMessages
   * @description Converts thread store messages to the shared ViewMessage contract so thread and main conversation use identical rendering.
   * @param {ThreadMessage[]} threadMessages - Array of ThreadMessage from ThreadStore
   * @returns {ViewMessage[]} Array of ViewMessage for conversation components
   */
  threadMessagesToViewMessages = (threadMessages: ThreadMessage[]): ViewMessage[] => {
    const currentUserId = this.authStore.user()?.uid || '';

    return threadMessages.map((thread) => {
      const user = this.userStore.getUserById()(thread.authorId);
      return {
        id: thread.id,
        senderId: thread.authorId,
        senderName: user?.displayName || 'Unknown User',
        senderAvatar: user?.photoURL || '/img/profile/profile-0.svg',
        content: thread.content,
        timestamp: thread.createdAt,
        isOwnMessage: thread.authorId === currentUserId,
        reactions: thread.reactions || [],
      };
    });
  };

  /**
   * Transform DirectMessages to ViewMessages
   * @description Entry point for DM list transformations; delegates per-message conversion to keep this method thin.
   * @param {DirectMessage[]} messages - Array of DirectMessage from DirectMessageStore
   * @returns {ViewMessage[]} Array of ViewMessage for conversation components
   */
  directMessagesToViewMessages = (messages: DirectMessage[]): ViewMessage[] => {
    const currentUserId = this.authStore.user()?.uid || '';

    return messages.map((msg) => this.transformDirectMessage(msg, currentUserId));
  };

  /**
   * Transform a single DirectMessage to ViewMessage
   * @description Normalizes mixed DM timestamp representations into Date values while resolving author identity for consistent conversation rendering.
   * @private
   * @param {DirectMessage} msg - DirectMessage to transform
   * @param {string} currentUserId - Current user ID for ownership check
   * @returns {ViewMessage} Transformed ViewMessage
   */
  private transformDirectMessage = (msg: DirectMessage, currentUserId: string): ViewMessage => {
    const user = this.userStore.getUserById()(msg.authorId);
    return {
      id: msg.id,
      senderId: msg.authorId,
      senderName: user?.displayName || 'Unknown User',
      senderAvatar: user?.photoURL || '/img/profile/profile-0.svg',
      content: msg.content,
      timestamp: msg.createdAt,
      isOwnMessage: msg.authorId === currentUserId,
      threadCount: msg.threadCount && msg.threadCount > 0 ? msg.threadCount : undefined,
      reactions: msg.reactions || [],
      lastThreadTimestamp:
        msg.lastThreadTimestamp instanceof Date
          ? msg.lastThreadTimestamp
          : msg.lastThreadTimestamp
            ? new Date(msg.lastThreadTimestamp)
            : undefined,
      isEdited: msg.isEdited,
      editedAt:
        msg.editedAt instanceof Date
          ? msg.editedAt
          : msg.editedAt
            ? new Date(msg.editedAt)
            : undefined,
    };
  };

  /**
   * Transform channel messages to view messages
   * @description Entry point for channel message list transformations; delegates per-message work to keep bulk mapping clean.
   * @param {PopupMessage[]} messages - Array of PopupMessage from ChannelMessageStore
   * @returns {ViewMessage[]} Array of ViewMessage for conversation components
   */
  channelMessagesToViewMessages = (messages: PopupMessage[]): ViewMessage[] => {
    const currentUserId = this.authStore.user()?.uid || '';

    return messages.map((msg) => this.transformChannelMessage(msg, currentUserId));
  };

  /**
   * Transform a single channel message to ViewMessage
   * @description Normalises channel message timestamps and resolves author data so the view layer receives a uniform ViewMessage regardless of message source.
   * @private
   * @param {PopupMessage} msg - Channel message to transform
   * @param {string} currentUserId - Current user ID for ownership check
   * @returns {ViewMessage} Transformed ViewMessage
   */
  private transformChannelMessage = (msg: PopupMessage, currentUserId: string): ViewMessage => {
    const author = this.userStore.getUserById()(msg.authorId);
    return {
      id: msg.id,
      senderId: msg.authorId,
      senderName: author?.displayName || 'Unknown User',
      senderAvatar: author?.photoURL || '/img/profile/profile-0.svg',
      content: msg.content,
      timestamp: msg.createdAt instanceof Date ? msg.createdAt : new Date(msg.createdAt),
      isOwnMessage: msg.authorId === currentUserId,
      reactions: msg.reactions || [],
      threadCount: msg.threadCount && msg.threadCount > 0 ? msg.threadCount : undefined,
      lastThreadTimestamp:
        msg.lastThreadTimestamp instanceof Date
          ? msg.lastThreadTimestamp
          : msg.lastThreadTimestamp
            ? new Date(msg.lastThreadTimestamp)
            : undefined,
      isEdited: msg.isEdited,
      editedAt:
        msg.editedAt instanceof Date
          ? msg.editedAt
          : msg.editedAt
            ? new Date(msg.editedAt)
            : undefined,
    };
  };

  /**
   * Get all users as UserListItem for popups and selection components
   * @description Returns a computed signal so mention/member popups stay in sync with the user store reactively without extra subscriptions.
   * @returns {Signal<UserListItem[]>} Signal containing array of user list items
   */
  getUserList = (): Signal<UserListItem[]> => {
    return computed(() =>
      this.userStore.users().map((user) => ({
        id: user.uid,
        name: user.displayName,
        avatar: user.photoURL || '/img/profile/profile-0.svg',
      })),
    );
  };

  /**
   * Get user display name by ID
   * @description Centralises fallback logic so all templates render a consistent placeholder when a user is deleted or not yet loaded.
   * @param {string} userId - User ID to lookup
   * @param {string} [fallback='Unknown User'] - Fallback name if user not found
   * @returns {string} User display name or fallback
   */
  getUserDisplayName = (userId: string, fallback = 'Unknown User'): string => {
    const user = this.userStore.getUserById()(userId);
    return user?.displayName || fallback;
  };

  /**
   * Get user avatar URL by ID
   * @description Centralises avatar fallback so all avatar renderings use the same default image path.
   * @param {string} userId - User ID to lookup
   * @param {string} [fallback='/img/profile/profile-0.svg'] - Fallback avatar URL if user not found
   * @returns {string} User avatar URL or fallback
   */
  getUserAvatar = (userId: string, fallback = '/img/profile/profile-0.svg'): string => {
    const user = this.userStore.getUserById()(userId);
    return user?.photoURL || fallback;
  };

  /**
   * Map member IDs to user list items
   * @description Filters out unknown members silently so the channel member list never shows placeholder entries for deleted users.
   * @param {string[]} memberIds - Array of user IDs
   * @returns {UserListItem[]} Array of UserListItem
   */
  mapMembersToListItems = (memberIds: string[]): UserListItem[] => {
    return memberIds
      .map((memberId) => this.mapUserToListItem(memberId))
      .filter((user): user is UserListItem => user !== null);
  };

  /**
   * Map single user ID to list item
   * @description Returns null for unknown IDs so mapMembersToListItems can filter them without duplicating the null-guard everywhere.
   * @private
   * @param {string} userId - User ID
   * @returns {UserListItem | null} UserListItem or null if user not found
   */
  private mapUserToListItem = (userId: string): UserListItem | null => {
    const user = this.userStore.getUserById()(userId);
    if (!user) return null;
    return {
      id: user.uid,
      name: user.displayName,
      avatar: user.photoURL || '/img/profile/profile-0.svg',
    };
  };

  /**
   * Map admin UIDs to admin data objects
   * @description Resolves admin UIDs to name-keyed objects so channel info views can display admin names without extra store lookups.
   * @param {string[]} adminUids - Array of admin user IDs
   * @returns {Array<{uid: string, name: string}>} Array of admin data objects
   */
  mapChannelAdmins = (adminUids: string[]): Array<{ uid: string; name: string }> => {
    return adminUids.map((adminUid) => ({
      uid: adminUid,
      name: this.getUserDisplayName(adminUid),
    }));
  };

  /**
   * Convert channel message to thread message format
   * @description Re-maps a channel message that is also the thread parent so ThreadComponent can render it with the same ViewMessage contract.
   * @param {any} channelMessage - Channel message to convert
   * @returns {ViewMessage} ViewMessage for thread component
   */
  channelMessageToThreadMessage = (channelMessage: any): ViewMessage => {
    return {
      id: channelMessage.id,
      senderId: channelMessage.senderId,
      senderName: channelMessage.senderName,
      senderAvatar: channelMessage.senderAvatar,
      content: channelMessage.content,
      timestamp: channelMessage.timestamp,
      isOwnMessage: channelMessage.isOwnMessage,
      reactions: channelMessage.reactions,
    };
  };

  /**
   * Load DM parent message for thread
   * @description Resolves thread parent messages from DM store snapshots and converts them into the shared ViewMessage contract used by thread UI.
   * @param {string} conversationId - DM conversation ID
   * @param {string} threadId - Thread message ID
   * @returns {ViewMessage | null} ViewMessage or null if not found
   */
  loadDMParentMessage = (conversationId: string, threadId: string): ViewMessage | null => {
    const messages = this.directMessageStore.messages()[conversationId] || [];
    const dmMessage = messages.find((msg) => msg.id === threadId);
    if (!dmMessage) {
      return null;
    }
    return this.directMessagesToViewMessages([dmMessage])[0];
  };

  /**
   * Load channel parent message for thread
   * @description Rehydrates channel thread parents from channel message state so thread entry remains consistent with channel conversation rendering.
   * @param {string} conversationId - Channel ID
   * @param {string} threadId - Thread message ID
   * @returns {ViewMessage | null} ViewMessage or null if not found
   */
  loadChannelParentMessage = (conversationId: string, threadId: string): ViewMessage | null => {
    const messages = this.channelMessageStore.getMessagesByChannel()(conversationId);
    const channelMessage = messages.find((msg) => msg.id === threadId);
    if (!channelMessage) {
      return null;
    }
    return this.channelMessageToThreadMessage(channelMessage);
  };
}
