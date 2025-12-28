/**
 * @fileoverview Dashboard Component
 * @description Main dashboard view after authentication
 * @module features/dashboard/pages/main
 */

import { Component, inject, signal } from '@angular/core';
import { DashboardHeaderComponent } from '../../components/dashboard-header/dashboard-header.component';
import { ChannelsSidebarComponent } from '../../components/channels-sidebar/channels-sidebar.component';
import { ChannalWelcomeComponent } from '../../components/channal-welcome/channal-welcome.component';
import { ChatMailboxComponent } from '../../components/chat-mailbox/chat-mailbox.component';
import { ChatNewMsgComponent } from '../../components/chat-new-msg/chat-new-msg.component';
import { ChatChannelComponent } from '../../components/chat-channel/chat-channel.component';
import { ChatMainComponent } from '../../components/chat-main/chat-main.component';
import { WorkspaceMenuToggleComponent } from '@shared/dashboard-components';
import { WorkspaceSidebarService } from '@shared/services/workspace-sidebar.service';
import { DummyChannelsService } from '../../services/dummy-channels.service';
import { DummyChatDmService } from '../../services/dummy-chat-dm.service';

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
    DashboardHeaderComponent,
    ChannelsSidebarComponent,
    ChannalWelcomeComponent,
    ChatMailboxComponent,
    ChatNewMsgComponent,
    ChatChannelComponent,
    ChatMainComponent,
    WorkspaceMenuToggleComponent,
  ],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.scss',
})
export class DashboardComponent {
  protected sidebarService = inject(WorkspaceSidebarService);
  protected channelsService = inject(DummyChannelsService);
  protected chatDmService = inject(DummyChatDmService);
  protected currentView = signal<DashboardView>('welcome');
  protected selectedChannel = signal<ChannelInfo | null>(null);
  protected selectedDM = signal<DMInfo | null>(null);

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
}
