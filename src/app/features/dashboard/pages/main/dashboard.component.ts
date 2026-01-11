/**
 * @fileoverview Dashboard Component
 * @description Main dashboard page handling channels, DMs, threads, and mailbox
 * @module features/dashboard/pages/main/dashboard
 */

import { Component, inject, ViewChild, effect, untracked } from '@angular/core';
import { Router } from '@angular/router';
import { WorkspaceHeaderComponent } from '../../components/workspace-header/workspace-header.component';
import { WorkspaceSidebarComponent } from '../../components/workspace-sidebar/workspace-sidebar.component';
import { WorkspaceMenuToggleComponent } from '@shared/dashboard-components';
import { WorkspaceSidebarService } from '@shared/services/workspace-sidebar.service';
import { DashboardStateService } from '@shared/services/dashboard-state.service';
import { DashboardInitializationService } from '@shared/services/dashboard-initialization.service';
import { ThreadManagementService } from '@shared/services/thread-management.service';
import { DashboardRouteHandlerService } from '@shared/services/dashboard-route-handler.service';
import { DashboardThreadCoordinatorService } from '@shared/services/dashboard-thread-coordinator.service';
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
  protected router = inject(Router);
  private routeHandler = inject(DashboardRouteHandlerService);
  private threadCoordinator = inject(DashboardThreadCoordinatorService);

  // Expose state from services for template
  protected currentView = this.dashboardState.currentView;
  protected selectedChannel = this.dashboardState.selectedChannel;
  protected selectedDM = this.dashboardState.selectedDM;
  protected isThreadOpen = this.threadManagement.isThreadOpen;
  protected threadInfo = this.threadManagement.threadInfo;

  /**
   * Component initialization
   * @description Initializes dashboard effects and sets up route listener
   */
  constructor() {
    this.dashboardInit.initializeEffects();
    this.setupRouteListener();
  }

  /**
   * Setup route parameter listener
   * @description Creates an effect that watches route parameter changes and handles routing
   * @returns void
   */
  private setupRouteListener = (): void => {
    effect(() => {
      const params = this.navigationService.getRouteParams()();
      untracked(() => this.handleRouteChange(params));
    });
  };

  /**
   * Handle route parameter changes
   * @description Delegates route handling to route handler service
   * @param params - Route parameters from navigation service
   * @returns void
   */
  private handleRouteChange = (params: any): void => {
    this.routeHandler.handleRouteChange(params, {
      showWelcome: this.showWelcome,
      showMailbox: this.showMailbox,
      showLegal: this.showLegal,
      showChannel: this.showChannel,
      showDirectMessage: this.showDirectMessage,
    });
  };

  /**
   * Show new message view
   * @description Closes any open thread and displays new message composition view
   * @returns void
   */
  showNewMessage = (): void => {
    if (this.threadManagement.isThreadOpen()) {
      this.threadManagement.closeThread();
    }
    this.dashboardState.showNewMessage();
  };

  /**
   * Show welcome view
   * @description Displays the welcome channel view
   * @returns void
   */
  showWelcome = (): void => {
    this.dashboardState.showWelcome();
  };

  /**
   * Show mailbox view
   * @description Displays the mailbox/invitations view
   * @returns void
   */
  showMailbox = (): void => {
    this.dashboardState.showMailbox();
  };

  /**
   * Show legal view
   * @description Displays the legal information view
   * @returns void
   */
  showLegal = (): void => {
    this.dashboardState.showLegal();
  };

  /**
   * Open channel by ID
   * @description Public API to open a channel, delegates to showChannel
   * @param channelId - Unique identifier of the channel
   * @returns void
   */
  openChannelById = (channelId: string): void => {
    this.showChannel(channelId);
  };

  /**
   * Show channel
   * @description Displays the specified channel and deselects any active DM
   * @param channelId - Unique identifier of the channel
   * @returns void
   */
  showChannel = (channelId: string): void => {
    this.dashboardState.showChannel(channelId, () => {
      if (this.sidebar) this.sidebar.deselectDirectMessage();
    });
  };

  /**
   * Show direct message conversation
   * @description Displays the specified DM conversation
   * @param conversationId - Unique identifier of the DM conversation
   * @param participants - Optional tuple of participant user IDs
   * @returns void
   */
  showDirectMessage = (conversationId: string, participants?: [string, string]): void => {
    this.dashboardState.showDirectMessage(conversationId, participants);
  };

  /**
   * Start direct message with user
   * @description Creates or opens existing DM conversation with specified user
   * @param userId - Unique identifier of the user to message
   * @returns Promise resolving when DM is created and navigation is complete
   */
  async startDirectMessageWithUser(userId: string): Promise<void> {
    if (this.threadManagement.isThreadOpen()) {
      this.threadManagement.closeThread();
    }

    if (!this.sidebar) return;

    const conversation = await this.sidebar.startDirectMessage(userId);
    if (conversation) {
      this.router.navigate(['/dashboard', 'dm', conversation.id]);
    }
  }

  /**
   * Open thread
   * @description Delegates thread opening to thread coordinator service
   * @param event - Thread request event containing messageId, parentMessage, and conversation details
   * @returns void
   */
  openThread = (event: {
    messageId: string;
    parentMessage: Message;
    conversationId?: string;
    isDirectMessage?: boolean;
  }): void => {
    this.threadCoordinator.openThread(event);
  };

  /**
   * Close thread
   * @description Delegates thread closing to thread coordinator service
   * @returns void
   */
  closeThread = (): void => {
    this.threadCoordinator.closeThread();
  };

  /**
   * Handle channel left event
   * @description Navigates to welcome channel after user leaves a channel
   * @returns void
   */
  onChannelLeft = (): void => {
    const welcomeId = this.dashboardState.navigateToWelcome();
    if (welcomeId && this.sidebar) {
      this.sidebar.selectChannelById(welcomeId);
    }
  };
}
