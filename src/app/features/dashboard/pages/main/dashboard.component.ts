/**
 * @fileoverview Dashboard Component
 * @description Main dashboard view after authentication
 * @module features/dashboard/pages/main
 */

import { Component, inject, signal } from '@angular/core';
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
import { DummyChannelsService } from '../../services/dummy-channels.service';
import { DummyChatDmService } from '../../services/dummy-chat-dm.service';
import { DummyThreadService } from '../../services/dummy-thread.service';
import { type Message } from '@shared/dashboard-components/conversation-messages/conversation-messages.component';
import { type ThreadInfo } from '../../components/thread/thread.component';

type DashboardView = 'welcome' | 'chat-new-msg' | 'mailbox' | 'channel' | 'direct-message';

export interface ChannelInfo {
  id: string;
  name: string;
  description: string;
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
  protected sidebarService = inject(WorkspaceSidebarService);
  protected channelsService = inject(DummyChannelsService);
  protected chatDmService = inject(DummyChatDmService);
  protected threadService = inject(DummyThreadService);
  protected currentView = signal<DashboardView>('welcome');
  protected selectedChannel = signal<ChannelInfo | null>(null);
  protected selectedDM = signal<DMInfo | null>(null);
  protected isThreadOpen = signal<boolean>(false);
  protected threadMessageId = signal<string | null>(null);
  protected threadInfo = signal<ThreadInfo | null>(null);

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
    const channel = this.channelsService.getChannelById(channelId);
    if (!channel) return;

    // Special channels
    if (channelId === 'mailbox') {
      this.showMailbox();
      return;
    }
    if (channelId === 'welcome') {
      this.showWelcome();
      return;
    }

    // Regular channel
    this.selectedChannel.set({
      id: channel.id,
      name: channel.name,
      description: channel.description,
      memberCount: channel.memberCount,
    });
    this.currentView.set('channel');
  }

  /**
   * Switch to direct message view
   */
  showDirectMessage(conversationId: string): void {
    const dm = this.chatDmService.directMessages().find((d) => d.id === conversationId);
    if (!dm) return;

    this.selectedDM.set({
      conversationId: dm.id,
      userName: dm.userName,
      userAvatar: dm.userAvatar,
      isOnline: dm.isOnline,
    });
    this.currentView.set('direct-message');
  }

  /**
   * Open thread view
   */
  openThread(event: { messageId: string; parentMessage: Message }): void {
    this.threadMessageId.set(event.messageId);

    // Get channel or DM name
    let channelName = '';

    if (this.currentView() === 'channel' && this.selectedChannel()) {
      channelName = this.selectedChannel()!.name;
    } else if (this.currentView() === 'direct-message' && this.selectedDM()) {
      channelName = this.selectedDM()!.userName;
    }

    this.threadInfo.set({
      parentMessageId: event.messageId,
      channelName: channelName,
      parentMessage: event.parentMessage,
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
}
