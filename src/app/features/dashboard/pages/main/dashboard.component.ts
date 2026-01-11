/**
 * @fileoverview Dashboard Component
 * @description Main dashboard page handling channels, DMs, threads, and mailbox
 * @module features/dashboard/pages/main/dashboard
 */

import { Component, inject, ViewChild, effect, untracked } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { WorkspaceHeaderComponent } from '../../components/workspace-header/workspace-header.component';
import { WorkspaceSidebarComponent } from '../../components/workspace-sidebar/workspace-sidebar.component';
import { WorkspaceMenuToggleComponent } from '@shared/dashboard-components';
import { WorkspaceSidebarService } from '@shared/services/workspace-sidebar.service';
import { DashboardStateService } from '@shared/services/dashboard-state.service';
import { DashboardInitializationService } from '@shared/services/dashboard-initialization.service';
import { ThreadManagementService } from '@shared/services/thread-management.service';
import { NavigationService, type RouteParams } from '@core/services/navigation/navigation.service';
import { WorkspaceInitializationService } from '@core/services/workspace-initialization/workspace-initialization.service';
import { ChannelMailboxComponent } from '../../components/channel-mailbox/channel-mailbox.component';
import { ChannalWelcomeComponent } from '../../components/channal-welcome/channal-welcome.component';
import { ChatNewMsgComponent } from '../../components/chat-new-msg/chat-new-msg.component';
import { ChannelConversationComponent } from '../../components/channel-conversation/channel-conversation.component';
import { ChatPrivateComponent } from '../../components/chat-private/chat-private.component';
import { ThreadComponent } from '../../components/thread/thread.component';
import { LegalOverviewComponent } from '../../../legal/components/legal-overview/legal-overview.component';
import { type Message } from '@shared/dashboard-components/conversation-messages/conversation-messages.component';
import { UserTransformationService } from '@core/services/user-transformation/user-transformation.service';

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
  protected workspaceInit = inject(WorkspaceInitializationService);
  protected route = inject(ActivatedRoute);
  protected router = inject(Router);
  private userTransformation = inject(UserTransformationService);

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
      untracked(() => this.handleRouteChangeWithParams(params));
    });
  };

  /**
   * Handle route parameter changes
   * @description Routes to appropriate handler based on path and parameters
   * @param params - Route parameters containing path, id, and optional threadId
   * @returns void
   */
  private handleRouteChangeWithParams = (params: RouteParams): void => {
    const { path, id, threadId } = params;
    if (!path) return this.handleDashboardRoot();
    if (path === 'channel' && id) return this.handleChannelRoute(id, threadId);
    if (path === 'dm' && id) return this.handleDirectMessageRoute(id, threadId);
    if (path === 'mailbox') return this.handleMailboxRoute();
    if (path === 'legal') return this.handleLegalRoute();
  };

  /**
   * Handle dashboard root route
   * @description Closes threads, selects welcome channel, and ensures clean URL
   * @returns void
   */
  private handleDashboardRoot = (): void => {
    if (this.threadManagement.isThreadOpen()) this.closeThreadInternal();
    this.workspaceInit.selectWelcomeChannel();
    this.showWelcome();
    this.ensureCleanDashboardUrl();
  };

  /**
   * Ensure clean dashboard URL
   * @description Navigates to /dashboard if URL contains additional segments
   * @returns void
   */
  private ensureCleanDashboardUrl = (): void => {
    const url = this.router.url;
    if (url !== '/dashboard' && !url.startsWith('/dashboard?')) {
      this.router.navigate(['/dashboard'], { replaceUrl: true });
    }
  };

  /**
   * Handle mailbox route
   * @description Closes threads, selects mailbox, and shows mailbox view
   * @returns void
   */
  private handleMailboxRoute = (): void => {
    if (this.threadManagement.isThreadOpen()) this.closeThreadInternal();
    this.navigationService.selectChannelById('mailbox');
    this.showMailbox();
  };

  /**
   * Handle legal route
   * @description Closes threads, selects legal view, and shows legal content
   * @returns void
   */
  private handleLegalRoute = (): void => {
    if (this.threadManagement.isThreadOpen()) this.closeThreadInternal();
    this.navigationService.selectChannelById('legal');
    this.showLegal();
  };

  /**
   * Handle channel route
   * @description Navigates to channel, manages thread state, and opens thread if specified in URL
   * @param channelId - Unique identifier of the channel
   * @param threadId - Optional thread ID to open
   * @returns void
   */
  private handleChannelRoute = (channelId: string, threadId?: string): void => {
    const previousId = this.navigationService.getSelectedChannelId()();
    const shouldKeepThread = !!threadId;

    this.navigationService.selectChannelById(channelId);
    this.closeThreadIfNeeded(previousId, channelId, shouldKeepThread);
    this.closeDMThreadIfNeeded();
    this.showChannel(channelId);

    if (threadId && !this.threadManagement.isThreadOpen()) {
      this.openThreadFromUrl(channelId, threadId, false);
    }
  };

  /**
   * Handle direct message route
   * @description Navigates to DM conversation, manages thread state, and opens thread if specified in URL
   * @param dmId - Unique identifier of the direct message conversation
   * @param threadId - Optional thread ID to open
   * @returns void
   */
  private handleDirectMessageRoute = (dmId: string, threadId?: string): void => {
    const previousId = this.navigationService.getSelectedDirectMessageId()();
    const shouldKeepThread = !!threadId;

    this.navigationService.selectDirectMessageById(dmId);
    this.closeThreadIfSwitchingDMs(previousId, dmId, shouldKeepThread);
    this.closeChannelThreadIfNeeded();
    this.showDirectMessage(dmId);

    if (threadId && !this.threadManagement.isThreadOpen()) {
      this.openThreadFromUrl(dmId, threadId, true);
    }
  };

  /**
   * Close channel thread if needed
   * @description Closes thread if no threadId in URL and current thread is a channel thread
   * @param previousId - Previous channel ID
   * @param newId - New channel ID
   * @param shouldKeep - Whether to keep thread open (based on threadId in URL)
   * @returns void
   */
  private closeThreadIfNeeded = (previousId: string | null, newId: string, shouldKeep: boolean): void => {
    if (shouldKeep) return;

    const info = this.threadManagement.threadInfo();
    if (info && !info.isDirectMessage) this.closeThreadInternal();
  };

  /**
   * Close DM thread if switching DMs
   * @description Closes thread if no threadId in URL and current thread is a DM thread
   * @param previousId - Previous DM conversation ID
   * @param newId - New DM conversation ID
   * @param shouldKeep - Whether to keep thread open (based on threadId in URL)
   * @returns void
   */
  private closeThreadIfSwitchingDMs = (previousId: string | null, newId: string, shouldKeep: boolean): void => {
    if (shouldKeep) return;

    const info = this.threadManagement.threadInfo();
    if (info && info.isDirectMessage) this.closeThreadInternal();
  };

  /**
   * Close channel thread if needed
   * @description Closes any open channel thread when switching to DM view
   * @returns void
   */
  private closeChannelThreadIfNeeded = (): void => {
    const info = this.threadManagement.threadInfo();
    if (info && !info.isDirectMessage) this.closeThreadInternal();
  };

  /**
   * Close DM thread if needed
   * @description Closes any open DM thread when switching to channel view
   * @returns void
   */
  private closeDMThreadIfNeeded = (): void => {
    const info = this.threadManagement.threadInfo();
    if (info && info.isDirectMessage) this.closeThreadInternal();
  };

  /**
   * Close thread internal
   * @description Delegates thread closing to thread management service
   * @returns void
   */
  private closeThreadInternal = (): void => {
    this.threadManagement.closeThread();
  };

  /**
   * Open thread from URL parameters
   * @description Loads parent message and opens thread with 100ms delay for data loading
   * @param conversationId - Channel or DM conversation ID
   * @param threadId - Thread message ID
   * @param isDM - Whether this is a DM thread
   * @returns void
   */
  private openThreadFromUrl = (conversationId: string, threadId: string, isDM: boolean): void => {
    setTimeout(() => {
      const message = isDM
        ? this.loadDMParentMessage(conversationId, threadId)
        : this.loadChannelParentMessage(conversationId, threadId);

      if (!message) return;

      const name = this.getConversationName(conversationId, isDM);
      this.threadManagement.openThread(threadId, message, conversationId, name, isDM);
    }, 100);
  };

  /**
   * Load DM parent message
   * @description Delegates DM parent message loading to user transformation service
   * @param conversationId - DM conversation ID
   * @param threadId - Thread message ID
   * @returns Parent message object or undefined
   */
  private loadDMParentMessage = (conversationId: string, threadId: string): any => {
    return this.userTransformation.loadDMParentMessage(conversationId, threadId);
  };

  /**
   * Load channel parent message
   * @description Delegates channel parent message loading to user transformation service
   * @param conversationId - Channel ID
   * @param threadId - Thread message ID
   * @returns Parent message object or undefined
   */
  private loadChannelParentMessage = (conversationId: string, threadId: string): any => {
    return this.userTransformation.loadChannelParentMessage(conversationId, threadId);
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
   * @description Opens thread panel for specified message and updates URL
   * @param event - Thread request event containing messageId, parentMessage, and conversation details
   * @returns void
   */
  openThread = (event: {
    messageId: string;
    parentMessage: Message;
    conversationId?: string;
    isDirectMessage?: boolean;
  }): void => {
    const isDM = event.isDirectMessage || false;
    const { id, name } = this.resolveConversationDetails(event.conversationId, isDM);

    this.threadManagement.openThread(event.messageId, event.parentMessage, id, name, isDM);
    this.updateUrlWithThread(event.messageId, id, isDM);
  };

  /**
   * Resolve conversation details
   * @description Gets conversation ID and name from event or current view
   * @param conversationId - Optional conversation ID from event
   * @param isDM - Whether this is a DM conversation
   * @returns Object containing conversation ID and name
   */
  private resolveConversationDetails = (
    conversationId: string | undefined,
    isDM: boolean
  ): { id: string; name: string } => {
    if (conversationId) {
      return { id: conversationId, name: this.getConversationName(conversationId, isDM) };
    }
    return this.getConversationFromCurrentView();
  };

  /**
   * Update URL with thread parameter
   * @description Adds thread ID to URL if not already present
   * @param threadId - Thread message ID
   * @param conversationId - Channel or DM conversation ID
   * @param isDM - Whether this is a DM thread
   * @returns void
   */
  private updateUrlWithThread = (threadId: string, conversationId: string, isDM: boolean): void => {
    if (this.router.url.includes('/thread/')) return;

    const path = isDM ? 'dm' : 'channel';
    this.router.navigate(['/dashboard', path, conversationId, 'thread', threadId], {
      replaceUrl: true,
    });
  };

  /**
   * Get conversation name
   * @description Retrieves conversation name from current state based on type
   * @param conversationId - Conversation ID (unused, kept for signature compatibility)
   * @param isDM - Whether this is a DM conversation
   * @returns Conversation name or empty string
   */
  private getConversationName = (conversationId: string, isDM: boolean): string => {
    if (isDM) {
      return this.dashboardState.selectedDM()?.userName || '';
    }
    return this.dashboardState.selectedChannel()?.name || '';
  };

  /**
   * Get conversation from current view
   * @description Extracts conversation details from currently active view state
   * @returns Object containing conversation ID and name, or empty values if no active conversation
   */
  private getConversationFromCurrentView = (): { id: string; name: string } => {
    if (this.currentView() === 'channel' && this.selectedChannel()) {
      return { id: this.selectedChannel()!.id, name: this.selectedChannel()!.name };
    }
    if (this.currentView() === 'direct-message' && this.selectedDM()) {
      return { id: this.selectedDM()!.conversationId, name: this.selectedDM()!.userName };
    }
    return { id: '', name: '' };
  };

  /**
   * Close thread
   * @description Closes thread panel and removes thread parameter from URL
   * @returns void
   */
  closeThread = (): void => {
    this.threadManagement.closeThread();
    this.removeThreadFromUrl();
  };

  /**
   * Remove thread from URL
   * @description Removes /thread/{id} segment from current URL
   * @returns void
   */
  private removeThreadFromUrl = (): void => {
    if (!this.router.url.includes('/thread/')) return;

    const urlParts = this.router.url.split('/thread/');
    if (urlParts.length > 0) {
      this.router.navigate([urlParts[0]], { replaceUrl: true });
    }
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
