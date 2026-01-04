/**
 * @fileoverview Workspace Sidebar Component
 * @description Collapsible sidebar showing channels, direct messages and workspace navigation
 * @module features/dashboard/components/workspace-sidebar
 */

import { Component, inject, output, input, signal, computed, effect } from '@angular/core';
import {
  ChannelStore,
  DirectMessageStore,
  UserStore,
  UserPresenceStore,
  ChannelMessageStore,
  ThreadStore,
} from '@stores/index';
import { CommonModule } from '@angular/common';
import { WorkspaceSidebarService } from '@shared/services/workspace-sidebar.service';
import { CreateChannelComponent } from '@shared/dashboard-components/create-channel/create-channel.component';
import { AddMemberAfterAddChannelComponent } from '@app/shared/dashboard-components/add-member-after-add-channel/add-member-after-add-channel.component';
import { ThreadUnreadPopupComponent } from '@shared/dashboard-components/thread-unread-popup/thread-unread-popup.component';
import { AuthStore } from '@stores/auth';
import { UnreadService } from '@core/services/unread/unread.service';
import { type Message as PopupMessage } from '@core/models/message.model';
import { type Message as ViewMessage } from '@shared/dashboard-components/conversation-messages/conversation-messages.component';

@Component({
  selector: 'app-workspace-sidebar',
  imports: [
    CommonModule,
    CreateChannelComponent,
    AddMemberAfterAddChannelComponent,
    ThreadUnreadPopupComponent,
  ],
  templateUrl: './workspace-sidebar.component.html',
  styleUrl: './workspace-sidebar.component.scss',
})
export class WorkspaceSidebarComponent {
  protected channelStore = inject(ChannelStore);
  protected directMessageStore = inject(DirectMessageStore);
  protected userStore = inject(UserStore);
  protected userPresenceStore = inject(UserPresenceStore);
  protected sidebarService = inject(WorkspaceSidebarService);
  protected authStore = inject(AuthStore);
  protected unreadService = inject(UnreadService);
  protected channelMessageStore = inject(ChannelMessageStore);
  protected threadStore = inject(ThreadStore);
  isNewMessageActive = input<boolean>(false);
  isMailboxActive = input<boolean>(false);
  newMessageRequested = output<void>();
  mailboxRequested = output<void>();
  channelSelected = output<string>();
  directMessageSelected = output<string>();
  threadOpened = output<{
    messageId: string;
    parentMessage: ViewMessage;
    isDirectMessage: boolean;
  }>();
  protected isChannelsOpen = signal(true);
  protected isDirectMessagesOpen = signal(true);
  protected isAddChannelActive = signal(false);
  protected isCreateChannelOpen = signal(false);
  protected isAddMemberAfterChannelOpen = signal(false);

  // Thread unread popup state
  protected hoveredThreadUnreadId = signal<string | null>(null);
  private hoverTimeout: any = null;

  // Temporary storage for channel data between popups
  protected pendingChannelName = signal<string>('');
  protected pendingChannelDescription = signal<string>('');
  protected pendingChannelIsPrivate = signal<boolean>(false);

  constructor() {
    // Load data from stores on initialization
    this.channelStore.loadChannels();
    this.userStore.loadUsers();

    // Load DM conversations when user's directMessages change
    // Note: This is now handled by the Dashboard component to avoid duplicate effects
    // The Dashboard component watches userDirectMessages computed and calls loadConversations

    // Auto-select DABubble-welcome channel when channels are loaded (only once on initial load)
    effect(() => {
      const channels = this.channelStore.channels();
      const currentSelected = this.selectedChannelId();
      const currentDM = this.selectedDirectMessageId();

      // Only auto-select if NOTHING is selected yet (no channel AND no DM) AND channels just loaded
      if (!currentSelected && !currentDM && channels.length > 0) {
        const welcomeChannel = channels.find((ch) => ch.name === 'DABubble-welcome');
        if (welcomeChannel) {
          this.selectedChannelId.set(welcomeChannel.id);
          this.channelSelected.emit(welcomeChannel.id);
        }
      }
    });
  }

  /**
   * Channels from ChannelStore - sorted with DABubble-welcome first, then alphabetically
   */
  protected sortedChannels = computed(() => {
    // Track update counter to force re-compute on Firestore updates
    this.channelMessageStore.updateCounter();

    const channels = this.channelStore.channels().map((ch) => {
      // Get all messages for this channel
      const messages = this.channelMessageStore.getMessagesByChannel()(ch.id);

      // Find latest NORMAL message timestamp (from createdAt of actual messages)
      const latestNormalMessageTime = messages.reduce((latest: Date | undefined, msg) => {
        const msgTime = msg.createdAt instanceof Date ? msg.createdAt : new Date(msg.createdAt);
        if (!latest || msgTime > latest) {
          return msgTime;
        }
        return latest;
      }, undefined);

      // Find latest THREAD message timestamp (from lastThreadTimestamp)
      const latestThreadTimestamp = messages.reduce((latest: Date | undefined, msg) => {
        if (msg.lastThreadTimestamp) {
          const threadTime =
            msg.lastThreadTimestamp instanceof Date
              ? msg.lastThreadTimestamp
              : new Date(msg.lastThreadTimestamp);
          if (!latest || threadTime > latest) {
            return threadTime;
          }
        }
        return latest;
      }, undefined);

      // RULE: Normal messages ALWAYS have priority over thread messages
      // Determine the timestamp to use for normal message unread check
      let normalMessageTimestamp: Date | undefined = latestNormalMessageTime;

      // If messages array is empty/not loaded, use ch.lastMessageAt as fallback
      // BUT only if it doesn't match the thread timestamp (meaning it's not a thread update)
      if (!normalMessageTimestamp && ch.lastMessageAt) {
        const lastMsgTime =
          ch.lastMessageAt instanceof Date ? ch.lastMessageAt : new Date(ch.lastMessageAt);
        const threadTime =
          latestThreadTimestamp instanceof Date
            ? latestThreadTimestamp
            : latestThreadTimestamp
            ? new Date(latestThreadTimestamp)
            : undefined;

        // Only use ch.lastMessageAt if it's NOT a thread update (timestamps don't match within 1 second)
        const isThreadUpdate =
          threadTime && Math.abs(lastMsgTime.getTime() - threadTime.getTime()) < 1000;
        if (!isThreadUpdate) {
          normalMessageTimestamp = lastMsgTime;
        }
      }

      const hasNormalUnread = normalMessageTimestamp
        ? this.unreadService.hasUnread(ch.id, normalMessageTimestamp)
        : false;

      // Thread-unread: Check if ANY message in this channel has an unread thread
      // Can be shown together with normal unread (blue + orange)
      // Force deep tracking by mapping lastThreadTimestamp
      const threadTimestamps = messages.map((m) => m.lastThreadTimestamp).filter(Boolean);
      const hasThreadUnread = messages.some((msg) => {
        if (!msg.lastThreadTimestamp) return false;

        // Get thread messages to check user participation
        const threadMessages = this.threadStore.getThreadsByMessageId()(msg.id);

        // Check if user participated in this thread
        const currentUserId = this.authStore.user()?.uid;
        if (!currentUserId) return false;

        const wroteThreadReply = threadMessages.some(
          (threadMsg) => threadMsg.authorId === currentUserId
        );
        const wroteParentMessage = msg.authorId === currentUserId;
        const userParticipated = wroteThreadReply || wroteParentMessage;

        // Only check for unread if user participated
        if (!userParticipated) return false;

        const threadTime =
          msg.lastThreadTimestamp instanceof Date
            ? msg.lastThreadTimestamp
            : new Date(msg.lastThreadTimestamp);

        // Check if this specific thread is unread
        const isUnread = this.unreadService.hasThreadUnread(ch.id, msg.id, threadTime);

        if (isUnread) {
          console.log('🟠 Thread unread detected:', {
            channelId: ch.id,
            channelName: ch.name,
            messageId: msg.id,
            threadTime,
            content: msg.content.substring(0, 30),
          });
        }

        return isUnread;
      });

      return {
        id: ch.id,
        name: ch.name,
        hasUnread: hasNormalUnread || false,
        hasThreadUnread: hasThreadUnread || false,
      };
    });

    // Separate DABubble-welcome from other channels
    const welcomeChannel = channels.find((ch) => ch.name === 'DABubble-welcome');
    const otherChannels = channels
      .filter((ch) => ch.name !== 'DABubble-welcome')
      .sort((a, b) => a.name.localeCompare(b.name));

    // Return DABubble-welcome first, then sorted channels
    return welcomeChannel ? [welcomeChannel, ...otherChannels] : otherChannels;
  });

  /**
   * Selected channel ID
   */
  protected selectedChannelId = signal<string | null>(null);

  /**
   * Direct messages from DirectMessageStore mapped to template interface
   * Shows all DM conversations sorted alphabetically by name
   */
  protected directMessages = computed<
    Array<{
      id: string;
      userId: string;
      name: string;
      avatar: string;
      isOnline: boolean;
      hasUnread: boolean;
      hasThreadUnread: boolean;
    }>
  >(() => {
    // Track update counter to force re-compute on Firestore updates
    this.directMessageStore.updateCounter();

    const currentUser = this.authStore.user();
    if (!currentUser) return [];

    const conversations = this.directMessageStore.sortedConversations();
    const allUsers = this.userStore.users();
    const allMessages = this.directMessageStore.messages();

    // Map conversations to UI format with user info
    const dmList = conversations.map((conv) => {
      // Get the other participant's ID
      const otherUserId = conv.participants.find((id) => id !== currentUser.uid);
      const otherUser = allUsers.find((u) => u.uid === otherUserId);

      // Get all messages for this conversation
      const messages = allMessages[conv.id] || [];

      // Find latest NORMAL message timestamp (from createdAt of actual messages)
      const latestNormalMessageTime = messages.reduce((latest: Date | undefined, msg) => {
        const msgTime = msg.createdAt instanceof Date ? msg.createdAt : new Date(msg.createdAt);
        if (!latest || msgTime > latest) {
          return msgTime;
        }
        return latest;
      }, undefined);

      // Find latest THREAD message timestamp (from lastThreadTimestamp)
      const latestThreadTimestamp = messages.reduce((latest: Date | undefined, msg) => {
        if (msg.lastThreadTimestamp) {
          const threadTime =
            msg.lastThreadTimestamp instanceof Date
              ? msg.lastThreadTimestamp
              : new Date(msg.lastThreadTimestamp);
          if (!latest || threadTime > latest) {
            return threadTime;
          }
        }
        return latest;
      }, undefined);

      // RULE: Normal messages ALWAYS have priority over thread messages
      // Determine the timestamp to use for normal message unread check
      let normalMessageTimestamp: Date | undefined = latestNormalMessageTime;

      // If messages array is empty/not loaded, use conv.lastMessageAt as fallback
      // BUT only if it doesn't match the thread timestamp (meaning it's not a thread update)
      if (!normalMessageTimestamp && conv.lastMessageAt) {
        const lastMsgTime =
          conv.lastMessageAt instanceof Date ? conv.lastMessageAt : new Date(conv.lastMessageAt);
        const threadTime =
          latestThreadTimestamp instanceof Date
            ? latestThreadTimestamp
            : latestThreadTimestamp
            ? new Date(latestThreadTimestamp)
            : undefined;

        // Only use conv.lastMessageAt if it's NOT a thread update (timestamps don't match within 1 second)
        const isThreadUpdate =
          threadTime && Math.abs(lastMsgTime.getTime() - threadTime.getTime()) < 1000;
        if (!isThreadUpdate) {
          normalMessageTimestamp = lastMsgTime;
        }
      }

      const hasNormalUnread = normalMessageTimestamp
        ? this.unreadService.hasUnread(conv.id, normalMessageTimestamp)
        : false;

      // Thread-unread: Check if ANY message in this conversation has an unread thread
      // Can be shown together with normal unread (blue + orange)
      // Force deep tracking by mapping lastThreadTimestamp
      const threadTimestamps = messages.map((m) => m.lastThreadTimestamp).filter(Boolean);
      const hasThreadUnread = messages.some((msg) => {
        if (!msg.lastThreadTimestamp) return false;

        // Get thread messages to check user participation
        const threadMessages = this.threadStore.getThreadsByMessageId()(msg.id);

        // Check if user participated in this thread
        const currentUserId = this.authStore.user()?.uid;
        if (!currentUserId) return false;

        const wroteThreadReply = threadMessages.some(
          (threadMsg) => threadMsg.authorId === currentUserId
        );
        const wroteParentMessage = msg.authorId === currentUserId;
        const userParticipated = wroteThreadReply || wroteParentMessage;

        // Only check for unread if user participated
        if (!userParticipated) return false;

        const threadTime =
          msg.lastThreadTimestamp instanceof Date
            ? msg.lastThreadTimestamp
            : new Date(msg.lastThreadTimestamp);

        // Check if this specific thread is unread
        const isUnread = this.unreadService.hasThreadUnread(conv.id, msg.id, threadTime);

        if (isUnread) {
          console.log('🟠 DM Thread unread detected:', {
            conversationId: conv.id,
            messageId: msg.id,
            threadTime,
            content: msg.content.substring(0, 30),
          });
        }

        return isUnread;
      });

      return {
        id: conv.id,
        userId: otherUserId || '',
        name: otherUser?.displayName || 'Unknown User',
        avatar: otherUser?.photoURL || '/img/profile/profile-0.svg',
        isOnline: otherUser?.isOnline || false,
        hasUnread: hasNormalUnread || false,
        hasThreadUnread: hasThreadUnread || false,
      };
    });

    // Sort alphabetically by name
    return dmList.sort((a, b) => a.name.localeCompare(b.name));
  });

  /**
   * All users from UserStore mapped to UserListItem for add-member popup
   */
  protected allUsers = computed(() =>
    this.userStore.users().map((user) => ({
      id: user.uid,
      name: user.displayName,
      avatar: user.photoURL || '/img/profile/profile-0.svg',
    }))
  );

  /**
   * Selected direct message ID
   */
  protected selectedDirectMessageId = signal<string | null>(null);

  /**
   * Open new message view
   */
  openNewMessage(): void {
    this.newMessageRequested.emit();
  }

  /**
   * Open mailbox view
   */
  openMailbox(): void {
    this.mailboxRequested.emit();
  }

  /**
   * Toggle channels dropdown
   */
  toggleChannels(): void {
    this.isChannelsOpen.update((value) => !value);
  }

  /**
   * Toggle direct messages dropdown
   */
  toggleDirectMessages(): void {
    this.isDirectMessagesOpen.update((value) => !value);
  }

  /**
   * Select a channel
   */
  selectChannel(channelId: string): void {
    const channel = this.channelStore.channels().find((ch) => ch.id === channelId);
    if (channel) {
      this.channelStore.selectChannel(channel);
      this.selectedChannelId.set(channelId);
      this.channelSelected.emit(channelId);
      this.unreadService.markAsRead(channelId);
    }
  }

  /**
   * Select a dummy channel
   */
  selectDummyChannel(channelId: string): void {
    this.selectedChannelId.set(channelId);
    this.channelSelected.emit(channelId);
  }

  /**
   * Public method to select a channel by ID (for parent components)
   */
  selectChannelById(channelId: string): void {
    this.selectedChannelId.set(channelId);
    this.channelSelected.emit(channelId);
  }

  /**
   * Add new channel
   */
  addChannel(): void {
    this.isAddChannelActive.update((v) => !v);
    this.isCreateChannelOpen.set(true);
  }

  /**
   * Handle create channel close
   */
  onCreateChannelClose(): void {
    this.isCreateChannelOpen.set(false);
  }

  /**
   * Handle create channel submit
   */
  onCreateChannel(data: { name: string; description: string; isPrivate: boolean }): void {
    // Store channel data temporarily
    this.pendingChannelName.set(data.name);
    this.pendingChannelDescription.set(data.description);
    this.pendingChannelIsPrivate.set(data.isPrivate);

    this.isCreateChannelOpen.set(false);
    this.isAddMemberAfterChannelOpen.set(true);
  }

  /**
   * Handle add member after channel close
   */
  onClose(): void {
    this.isAddMemberAfterChannelOpen.set(false);
    this.pendingChannelName.set('');
    this.pendingChannelDescription.set('');
    this.pendingChannelIsPrivate.set(false);
  }

  /**
   * Handle add member after channel cancel - create channel without inviting members
   */
  async onCancel(): Promise<void> {
    const currentUserId = this.authStore.user()?.uid;
    if (!currentUserId) return;

    // Create channel via store
    const newChannelId = await this.channelStore.createChannel(
      {
        name: this.pendingChannelName(),
        description: this.pendingChannelDescription(),
        isPrivate: this.pendingChannelIsPrivate(),
        members: [currentUserId],
      },
      currentUserId
    );

    this.isAddMemberAfterChannelOpen.set(false);
    this.pendingChannelName.set('');
    this.pendingChannelDescription.set('');
    this.pendingChannelIsPrivate.set(false);

    // Auto-select the newly created channel
    this.selectedChannelId.set(newChannelId);
    this.channelSelected.emit(newChannelId);
  }

  /**
   * Handle add member after channel create - create channel and send invitations
   */
  async onCreate(data: {
    type: 'all' | 'specific';
    searchValue?: string;
    selectedChannels: Array<{ id: string; name: string }>;
    selectedUsers: Array<{ id: string; name: string; avatar: string }>;
  }): Promise<void> {
    const currentUserId = this.authStore.user()?.uid;
    if (!currentUserId) return;

    // Start with the creator as member
    const memberIds = new Set<string>([currentUserId]);

    // Add selected users
    data.selectedUsers.forEach((user) => memberIds.add(user.id));

    // Add members from selected channels
    data.selectedChannels.forEach((selectedChannel) => {
      const channel = this.channelStore.channels().find((ch) => ch.id === selectedChannel.id);
      if (channel) {
        channel.members.forEach((memberId) => memberIds.add(memberId));
      }
    });

    // Create channel via store
    const newChannelId = await this.channelStore.createChannel(
      {
        name: this.pendingChannelName(),
        description: this.pendingChannelDescription(),
        isPrivate: this.pendingChannelIsPrivate(),
        members: Array.from(memberIds),
      },
      currentUserId
    );

    this.isAddMemberAfterChannelOpen.set(false);
    this.pendingChannelName.set('');
    this.pendingChannelDescription.set('');
    this.pendingChannelIsPrivate.set(false);

    // Auto-select the newly created channel
    this.selectedChannelId.set(newChannelId);
    this.channelSelected.emit(newChannelId);
  }

  /**
   * Select a direct message
   */
  selectDirectMessage(messageId: string): void {
    // Deselect channel when DM is selected
    this.selectedChannelId.set(null);
    this.selectedDirectMessageId.set(messageId);
    this.directMessageSelected.emit(messageId);
    this.unreadService.markAsRead(messageId);
  }

  /**
   * Deselect the current direct message
   */
  deselectDirectMessage(): void {
    this.selectedDirectMessageId.set(null);
  }

  /**
   * Start or open a direct message conversation with a user
   * @param userId The other user's ID
   * @returns Conversation data { id, participants }
   */
  async startDirectMessage(userId: string): Promise<{
    id: string;
    participants: [string, string];
  } | null> {
    const currentUser = this.authStore.user();
    if (!currentUser) {
      console.error('❌ Cannot start DM: No current user');
      return null;
    }

    console.log('🚀 Starting DM conversation', {
      currentUserId: currentUser.uid,
      otherUserId: userId,
      currentUserDirectMessages: currentUser.directMessages,
    });

    try {
      // Start or get existing conversation
      const conversation = await this.directMessageStore.startConversation(currentUser.uid, userId);

      console.log('✅ Conversation created/found:', conversation.id);

      // Don't reload conversations here - the conversation was already added to store in startConversation()
      // The user store listener will automatically trigger loadConversations() when the user doc updates

      // Load messages for this conversation
      await this.directMessageStore.loadMessages(conversation.id);

      console.log('✅ Messages loaded for conversation:', conversation.id);

      // Mark as read for the user who started the conversation
      await this.unreadService.markAsRead(conversation.id);

      // Deselect channel
      this.selectedChannelId.set(null);

      // Select the conversation (don't emit here - let caller handle navigation)
      this.selectedDirectMessageId.set(conversation.id);

      console.log('✅ DM conversation opened:', conversation.id);

      return conversation;
    } catch (error) {
      console.error('❌ Failed to start DM conversation:', error);
      return null;
    }
  }

  /**
   * Handle thread click from popup
   */
  onThreadClick(
    event: {
      messageId: string;
      parentMessage: PopupMessage;
      conversationId: string;
      isDirectMessage: boolean;
    },
    isDirectMessage: boolean
  ): void {
    // First, navigate to the channel or DM
    if (event.isDirectMessage) {
      // Select the DM conversation
      this.selectedDirectMessageId.set(event.conversationId);
      this.selectedChannelId.set(null);
      this.directMessageSelected.emit(event.conversationId);
    } else {
      // Select the channel
      this.selectedChannelId.set(event.conversationId);
      this.selectedDirectMessageId.set(null);
      this.channelSelected.emit(event.conversationId);
    }

    // Small delay to ensure conversation is loaded before opening thread
    setTimeout(() => {
      // Convert PopupMessage to ViewMessage format
      const user = this.userStore.users().find((u) => u.uid === event.parentMessage.authorId);
      const currentUserId = this.authStore.user()?.uid;

      const viewMessage: ViewMessage = {
        id: event.parentMessage.id,
        senderId: event.parentMessage.authorId,
        senderName: user?.displayName || 'Unknown',
        senderAvatar: user?.photoURL || '',
        content: event.parentMessage.content,
        timestamp: event.parentMessage.createdAt,
        isOwnMessage: event.parentMessage.authorId === currentUserId,
        reactions: event.parentMessage.reactions,
        threadCount: event.parentMessage.threadCount,
        lastThreadTimestamp: event.parentMessage.lastThreadTimestamp,
        isEdited: event.parentMessage.isEdited,
        editedAt: event.parentMessage.editedAt,
      };

      this.threadOpened.emit({
        messageId: event.messageId,
        parentMessage: viewMessage,
        isDirectMessage: event.isDirectMessage,
      });

      // Close popup
      this.hoveredThreadUnreadId.set(null);
    }, 100);
  }

  /**
   * Handle mouse enter on thread unread item
   */
  onThreadUnreadMouseEnter(id: string): void {
    if (this.hoverTimeout) {
      clearTimeout(this.hoverTimeout);
    }
    this.hoveredThreadUnreadId.set(id);
  }

  /**
   * Handle mouse leave on thread unread item
   */
  onThreadUnreadMouseLeave(): void {
    // Add delay before hiding to allow moving to popup
    this.hoverTimeout = setTimeout(() => {
      this.hoveredThreadUnreadId.set(null);
    }, 200);
  }

  /**
   * Cancel hover timeout (when entering popup)
   */
  onPopupMouseEnter(): void {
    if (this.hoverTimeout) {
      clearTimeout(this.hoverTimeout);
    }
  }
}
