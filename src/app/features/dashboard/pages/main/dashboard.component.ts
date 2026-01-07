/**
 * @fileoverview Dashboard Component
 * @description Main dashboard view after authentication
 * @module features/dashboard/pages/main
 */

import { Component, inject, ViewChild, effect } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { WorkspaceHeaderComponent } from '../../components/workspace-header/workspace-header.component';
import { WorkspaceSidebarComponent } from '../../components/workspace-sidebar/workspace-sidebar.component';
import { WorkspaceMenuToggleComponent } from '@shared/dashboard-components';
import { WorkspaceSidebarService } from '@shared/services/workspace-sidebar.service';
import { DashboardStateService } from '@shared/services/dashboard-state.service';
import { DashboardInitializationService } from '@shared/services/dashboard-initialization.service';
import { ThreadManagementService } from '@shared/services/thread-management.service';
import { NavigationService } from '@core/services/navigation/navigation.service';
import { ChannelMailboxComponent } from '../../components/channel-mailbox/channel-mailbox.component';
import { ChannalWelcomeComponent } from '../../components/channal-welcome/channal-welcome.component';
import { ChatNewMsgComponent } from '../../components/chat-new-msg/chat-new-msg.component';
import { ChannelConversationComponent } from '../../components/channel-conversation/channel-conversation.component';
import { ChatPrivateComponent } from '../../components/chat-private/chat-private.component';
import { ThreadComponent } from '../../components/thread/thread.component';
import { LegalOverviewComponent } from '../../../legal/components/legal-overview/legal-overview.component';
import { type Message } from '@shared/dashboard-components/conversation-messages/conversation-messages.component';

@Component({
  selector: 'app-dashboard',
  imports: [
    WorkspaceHeaderComponent,
    WorkspaceSidebarComponent,
    ChannalWelcomeComponent,
    ChannelMailboxComponent,
    ChatNewMsgComponent,
    ChannelConversationComponent,
    ChatPrivateComponent,
    ThreadComponent,
    LegalOverviewComponent,
    WorkspaceMenuToggleComponent,
  ],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.scss',
})
export class DashboardComponent {
  @ViewChild('sidebar') sidebar!: WorkspaceSidebarComponent;

  protected sidebarService = inject(WorkspaceSidebarService);
  protected dashboardState = inject(DashboardStateService);
  protected dashboardInit = inject(DashboardInitializationService);
  protected threadManagement = inject(ThreadManagementService);
  protected navigationService = inject(NavigationService);
  protected route = inject(ActivatedRoute);
  protected router = inject(Router);

  // Expose state from services for template
  protected currentView = this.dashboardState.currentView;
  protected selectedChannel = this.dashboardState.selectedChannel;
  protected selectedDM = this.dashboardState.selectedDM;
  protected isThreadOpen = this.threadManagement.isThreadOpen;
  protected threadInfo = this.threadManagement.threadInfo;

  constructor() {
    // Initialize message loading effects
    this.dashboardInit.initializeEffects();

    // Always show welcome on page reload and reset URL to /dashboard
    this.dashboardState.showWelcome();

    const url = this.router.url;
    if (url !== '/dashboard') {
      this.router.navigate(['/dashboard'], { replaceUrl: true });
    }

    // Listen to route changes for deep linking (reactive)
    effect(() => {
      const params = this.navigationService.getRouteParams()();
      const { path, id } = params;

      // /dashboard (no subpath) → show welcome
      if (!path) {
        this.showWelcome();
        return;
      }

      if (path === 'channel' && id) {
        this.showChannel(id);
        if (this.sidebar) {
          this.sidebar.selectChannelById(id);
        }
      } else if (path === 'dm' && id) {
        this.showDirectMessage(id);
        if (this.sidebar) {
          this.sidebar.selectDirectMessageById(id);
        }
      } else if (path === 'mailbox') {
        this.showMailbox();
      } else if (path === 'legal') {
        this.showLegal();
      }
    });
  }

  /**
   * Switch to new message view
   */
  showNewMessage(): void {
    this.dashboardState.showNewMessage();
  }

  /**
   * Switch to welcome view
   */
  showWelcome(): void {
    this.dashboardState.showWelcome();
  }

  /**
   * Switch to mailbox view
   */
  showMailbox(): void {
    this.dashboardState.showMailbox();
  }

  /**
   * Switch to legal overview view
   */
  showLegal(): void {
    this.dashboardState.showLegal();
  }

  /**
   * Open channel by ID (used by mailbox after accepting invitation)
   */
  openChannelById(channelId: string): void {
    this.showChannel(channelId);
  }

  /**
   * Switch to channel view
   */
  showChannel(channelId: string): void {
    // Close thread panel if open
    if (this.threadManagement.isThreadOpen()) {
      this.threadManagement.closeThread();
    }

    this.dashboardState.showChannel(channelId, () => {
      if (this.sidebar) {
        this.sidebar.deselectDirectMessage();
      }
    });
  }

  /**
   * Switch to direct message view
   */
  showDirectMessage(conversationId: string, participants?: [string, string]): void {
    // Close thread panel if open
    if (this.threadManagement.isThreadOpen()) {
      this.threadManagement.closeThread();
    }

    this.dashboardState.showDirectMessage(conversationId, participants);
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
        this.showDirectMessage(conversation.id, conversation.participants as [string, string]);
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

    this.threadManagement.openThread(
      event.messageId,
      event.parentMessage,
      channelId,
      channelName,
      isDirectMessage
    );
  }

  /**
   * Close thread view
   */
  closeThread(): void {
    this.threadManagement.closeThread();
  }

  /**
   * Handle channel left - navigate to DABubble-welcome and update sidebar
   */
  onChannelLeft(): void {
    const welcomeChannelId = this.dashboardState.navigateToWelcome();
    if (welcomeChannelId && this.sidebar) {
      this.sidebar.selectChannelById(welcomeChannelId);
    }
  }
}
