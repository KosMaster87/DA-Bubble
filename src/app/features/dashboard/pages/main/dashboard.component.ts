/**
 * @fileoverview Dashboard Component
 * @description Main dashboard view after authentication
 * @module features/dashboard/pages/main
 */

import { Component, inject, signal, ViewChild, effect } from '@angular/core';
import { WorkspaceHeaderComponent } from '../../components/workspace-header/workspace-header.component';
import { WorkspaceSidebarComponent } from '../../components/workspace-sidebar/workspace-sidebar.component';
import { WorkspaceMenuToggleComponent } from '@shared/dashboard-components';
import { WorkspaceSidebarService } from '@shared/services/workspace-sidebar.service';
import { ChannalMailboxComponent } from '../../components/channel-mailbox/channel-mailbox.component';
import { ChannalWelcomeComponent } from '../../components/channal-welcome/channal-welcome.component';
import { ChatNewMsgComponent } from '../../components/chat-new-msg/chat-new-msg.component';
import { ChannelConversationComponent } from '../../components/channel-conversation/channel-conversation.component';
import { ChatPrivateComponent } from '../../components/chat-private/chat-private.component';
import { ThreadComponent } from '../../components/thread/thread.component';
import { ChannelStore } from '../../../../stores/channel.store';
import { DirectMessageStore } from '../../../../stores/direct-message.store';
import { ThreadStore } from '../../../../stores/thread.store';
import { UserStore } from '../../../../stores/user.store';
import { AuthStore } from '../../../../stores/auth';
import { type Message } from '@shared/dashboard-components/conversation-messages/conversation-messages.component';
import { type ThreadInfo } from '../../components/thread/thread.component';

type DashboardView = 'welcome' | 'chat-new-msg' | 'mailbox' | 'channel' | 'direct-message';

export interface ChannelInfo {
  id: string;
  name: string;
  description: string;
  isPrivate: boolean;
  memberCount: number;
}

export interface DMInfo {
  conversationId: string;
  userName: string;
  userAvatar: string;
  isOnline: boolean;
}

@Component({
  selector: 'app-dashboard',
  imports: [
    WorkspaceHeaderComponent,
    WorkspaceSidebarComponent,
    ChannalWelcomeComponent,
    ChannalMailboxComponent,
    ChatNewMsgComponent,
    ChannelConversationComponent,
    ChatPrivateComponent,
    ThreadComponent,
    WorkspaceMenuToggleComponent,
  ],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.scss',
})
export class DashboardComponent {
  @ViewChild('sidebar') sidebar!: WorkspaceSidebarComponent;

  protected sidebarService = inject(WorkspaceSidebarService);
  protected channelStore = inject(ChannelStore);
  protected directMessageStore = inject(DirectMessageStore);
  protected threadStore = inject(ThreadStore);
  protected userStore = inject(UserStore);
  protected authStore = inject(AuthStore);
  protected currentView = signal<DashboardView>('welcome');
  protected selectedChannel = signal<ChannelInfo | null>(null);
  protected selectedDM = signal<DMInfo | null>(null);
  protected isThreadOpen = signal<boolean>(false);
  protected threadMessageId = signal<string | null>(null);
  protected threadInfo = signal<ThreadInfo | null>(null);

  constructor() {
    // Default view is welcome (DABubble-welcome channel)
    this.currentView.set('welcome');

    // Debug effect to track view changes
    // effect(() => {
    //   console.log('🎯 Dashboard View Effect:', {
    //     currentView: this.currentView(),
    //     selectedDM: this.selectedDM(),
    //     selectedChannel: this.selectedChannel(),
    //     shouldShowDM: this.currentView() === 'direct-message' && !!this.selectedDM(),
    //     shouldShowChannel: this.currentView() === 'channel' && !!this.selectedChannel(),
    //   });
    // });
  }

  /**
   * Switch to new message view
   */
  showNewMessage(): void {
    this.currentView.set('chat-new-msg');
  }

  /**
   * Switch to welcome view
   */
  showWelcome(): void {
    this.currentView.set('welcome');
  }

  /**
   * Switch to mailbox view
   */
  showMailbox(): void {
    this.currentView.set('mailbox');
  }

  /**
   * Switch to channel view
   */
  showChannel(channelId: string): void {
    // Close thread panel if open
    if (this.isThreadOpen()) {
      this.closeThread();
    }

    // Use computed signal correctly
    const channelGetter = this.channelStore.getChannelById();
    const channel = channelGetter ? channelGetter(channelId) : null;
    if (!channel) return;

    // Special channels - hardcoded IDs
    if (channelId === 'mailbox') {
      this.showMailbox();
      return;
    }

    // DABubble-welcome channel - special view
    if (channel.name === 'DABubble-welcome') {
      this.currentView.set('welcome');
      // Deselect any active DM
      if (this.sidebar) {
        this.sidebar.deselectDirectMessage();
      }
      return;
    }

    // Regular channel
    this.selectedChannel.set({
      id: channel.id,
      name: channel.name,
      description: channel.description,
      isPrivate: channel.isPrivate,
      memberCount: channel.members.length,
    });
    // Deselect any active DM
    if (this.sidebar) {
      this.sidebar.deselectDirectMessage();
    }
    this.currentView.set('channel');
  }

  /**
   * Switch to direct message view
   */
  showDirectMessage(conversationId: string, participants?: [string, string]): void {
    console.log('📱 showDirectMessage called', {
      conversationId,
      participants,
      currentView: this.currentView(),
      stack: new Error().stack,
    });

    // Close thread panel if open
    if (this.isThreadOpen()) {
      this.closeThread();
    }

    // Get current user to determine the other participant
    const currentUserId = this.authStore.user()?.uid;
    if (!currentUserId) return;

    // Get conversation from DirectMessageStore
    let conversation = this.directMessageStore
      .sortedConversations()
      .find((c) => c.id === conversationId);

    // If conversation not found in store yet, use provided participants
    let otherUserId: string | undefined;
    if (!conversation && participants) {
      otherUserId = participants.find((id) => id !== currentUserId);
      console.log('Using provided participants, otherUserId:', otherUserId);
    } else if (conversation) {
      otherUserId = conversation.participants.find((id) => id !== currentUserId);
    }

    if (!otherUserId) {
      console.error('Cannot determine other user');
      return;
    }

    // Get other user's data from UserStore
    const otherUser = this.userStore.getUserById()(otherUserId);
    if (!otherUser) {
      console.error('Other user not found:', otherUserId);
      return;
    }

    this.selectedDM.set({
      conversationId: conversationId,
      userName: otherUser.displayName,
      userAvatar: otherUser.photoURL || '/img/profile/profile-0.svg',
      isOnline: otherUser.isOnline,
    });

    console.log('✅ Setting currentView to direct-message', {
      conversationId,
      userName: otherUser.displayName,
      selectedDMValue: this.selectedDM(),
    });

    this.currentView.set('direct-message');

    console.log('📊 After setting currentView', {
      currentView: this.currentView(),
      selectedDM: this.selectedDM(),
      hasSelectedDM: !!this.selectedDM(),
    });
  }

  /**
   * Start a direct message conversation with a user
   * Called from profile view or other places
   */
  async startDirectMessageWithUser(userId: string): Promise<void> {
    // Use sidebar component to start the conversation
    if (this.sidebar) {
      const conversation = await this.sidebar.startDirectMessage(userId);
      // Pass participants to showDirectMessage in case store hasn't synced yet
      if (conversation) {
        this.showDirectMessage(conversation.id, conversation.participants);
      }
    }
  }

  /**
   * Open thread view
   */
  openThread(event: {
    messageId: string;
    parentMessage: Message;
    isDirectMessage?: boolean;
  }): void {
    this.threadMessageId.set(event.messageId);

    // Get channel or DM name and ID
    let channelName = '';
    let channelId = '';
    let isDirectMessage = event.isDirectMessage || false;

    if (this.currentView() === 'channel' && this.selectedChannel()) {
      channelName = this.selectedChannel()!.name;
      channelId = this.selectedChannel()!.id;
      isDirectMessage = false;
    } else if (this.currentView() === 'direct-message' && this.selectedDM()) {
      channelName = this.selectedDM()!.userName;
      channelId = this.selectedDM()!.conversationId;
      isDirectMessage = true;
    }

    this.threadInfo.set({
      channelId: channelId,
      parentMessageId: event.messageId,
      channelName: channelName,
      parentMessage: event.parentMessage,
      isDirectMessage: isDirectMessage,
    });
    this.isThreadOpen.set(true);
  }

  /**
   * Close thread view
   */
  closeThread(): void {
    this.isThreadOpen.set(false);
    this.threadMessageId.set(null);
    this.threadInfo.set(null);
  }

  /**
   * Handle channel left - navigate to DABubble-welcome and update sidebar
   */
  onChannelLeft(): void {
    // Find DABubble-welcome channel
    const welcomeChannel = this.channelStore
      .channels()
      .find((ch) => ch.name === 'DABubble-welcome');
    if (welcomeChannel) {
      // Update sidebar selection
      this.sidebar.selectChannelById(welcomeChannel.id);
      // Show welcome view
      this.showChannel(welcomeChannel.id);
    } else {
      // Fallback if DABubble-welcome not found
      this.showWelcome();
    }
  }
}
