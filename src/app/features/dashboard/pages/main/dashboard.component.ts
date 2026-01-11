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
import { WorkspaceInitializationService } from '@core/services/workspace-initialization/workspace-initialization.service';
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
  protected workspaceInit = inject(WorkspaceInitializationService);
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

    effect(() => {
      this.handleRouteChange();
    });

    // Listen to route changes for deep linking (reactive)
    // FLOW: Route changes → effect runs → handleRouteChange() → route-specific handlers
    effect(() => {
      this.handleRouteChange();
    });
  }

  /**
   * FLOW DOCUMENTATION - MASTER NAVIGATION CONTROLLER:
   * BEFORE: URL changed (user clicked sidebar, thread-unread-popup, or browser back/forward)
   * TRIGGERS: Angular Router updates route params → navigationService.getRouteParams() signal changes → this effect runs
   *
   * ROUTING SCENARIOS:
   * 1. /dashboard → Show welcome screen
   * 2. /dashboard/channel/:id → handleChannelRoute() → Show channel conversation
   * 3. /dashboard/channel/:id/thread/:threadId → handleChannelRoute() → Show channel + open thread
   * 4. /dashboard/dm/:id → handleDirectMessageRoute() → Show DM conversation
   * 5. /dashboard/dm/:id/thread/:threadId → handleDirectMessageRoute() → Show DM + open thread
   * 6. /dashboard/mailbox → Show mailbox
   * 7. /dashboard/legal → Show legal overview
   *
   * CRITICAL THREAD MANAGEMENT LOGIC:
   * - When URL has /thread/:threadId, shouldKeepThreadOpen() returns TRUE
   * - This prevents closing threads that were just opened (e.g., from thread-unread-popup)
   * - Cross-type navigation (Channel ↔ DM) handled by dedicated closers
   * - Same-type navigation (Channel A → Channel B) only closes thread if it was in old conversation
   *
   * PROCESS:
   * 1. Get current route params (path, id, threadId) from navigation service
   * 2. Pass threadId to handlers so they can determine thread closing logic with current params
   * 3. Each handler manages: sidebar updates, thread closing logic, view display
   *
   * AFTER: Correct view is displayed, threads managed appropriately
   * NEXT: View components load data and render UI
   */
  private handleRouteChange = (): void => {
    const params = this.navigationService.getRouteParams()();
    const { path, id, threadId } = params;

    console.log('[DEBUG handleRouteChange] URL:', window.location.href, 'Params:', params);

    if (!path) {
      // Close any open thread before showing welcome
      if (this.threadManagement.isThreadOpen()) {
        this.closeThreadInternal();
      }
      // Select DABubble-welcome channel in sidebar
      this.workspaceInit.selectWelcomeChannel();
      this.showWelcome();

      // Navigate to /dashboard to ensure clean URL state after page reload
      const currentUrl = this.router.url;
      if (currentUrl !== '/dashboard' && !currentUrl.startsWith('/dashboard?')) {
        this.router.navigate(['/dashboard'], { replaceUrl: true });
      }
      return;
    }

    if (path === 'channel' && id) {
      this.handleChannelRoute(id, threadId);
    } else if (path === 'dm' && id) {
      this.handleDirectMessageRoute(id, threadId);
    } else if (path === 'mailbox') {
      // Close any open thread before showing mailbox
      if (this.threadManagement.isThreadOpen()) {
        this.closeThreadInternal();
      }
      // Select mailbox in sidebar (mailbox is treated as a virtual channel)
      this.navigationService.selectChannelById('mailbox');
      this.showMailbox();
    } else if (path === 'legal') {
      // Close any open thread before showing legal
      if (this.threadManagement.isThreadOpen()) {
        this.closeThreadInternal();
      }
      // Select legal in sidebar (legal is treated as a virtual channel)
      this.navigationService.selectChannelById('legal');
      this.showLegal();
    }
  };

  /**
   * Handle channel route navigation
   *
   * FLOW DOCUMENTATION:
   * BEFORE: Route params changed to /dashboard/channel/:channelId or /dashboard/channel/:channelId/thread/:threadId
   * TRIGGERS: This function is called by handleRouteChange() effect when path === 'channel'
   *
   * PROCESS:
   * 1. Get previous channel ID from navigation service
   * 2. Check if thread should stay open (URL has /thread/ threadId parameter)
   * 3. Update sidebar to highlight the new channel
   * 4. Close thread if switching between different channels (only if thread was in previous channel)
   * 5. Close DM thread if switching from DM to Channel (only if URL doesn't have /thread/)
   * 6. Show channel conversation
   *
   * AFTER: Channel conversation is displayed, sidebar updated, threads closed if needed
   * NEXT: Channel component loads messages, may open thread if URL has /thread/:threadId
   */
  private handleChannelRoute = (channelId: string, threadId?: string): void => {
    const previousChannelId = this.navigationService.getSelectedChannelId()();
    const shouldKeepThread = !!threadId; // Keep thread open if URL has /thread/:threadId

    console.log('[DEBUG handleChannelRoute]', {
      channelId,
      threadId,
      shouldKeepThread,
      previousChannelId,
      currentThreadInfo: this.threadManagement.threadInfo()
    });

    // Select channel in sidebar AND navigationService state (for browser navigation)
    this.navigationService.selectChannelById(channelId);
    this.closeThreadIfNeeded(previousChannelId, channelId, shouldKeepThread);
    this.closeDMThreadIfNeeded(); // Close DM thread when switching to Channel
    this.showChannel(channelId);
  };

  /**
   * Handle direct message route navigation
   *
   * FLOW DOCUMENTATION:
   * BEFORE: Route params changed to /dashboard/dm/:dmId or /dashboard/dm/:dmId/thread/:threadId
   * TRIGGERS: This function is called by handleRouteChange() effect when path === 'dm'
   *
   * PROCESS:
   * 1. Get previous DM ID from navigation service
   * 2. Check if thread should stay open (URL has /thread/ threadId parameter)
   * 3. Update sidebar to highlight the new DM
   * 4. Close thread if switching between different DMs (only if thread was in previous DM)
   * 5. Close Channel thread if switching from Channel to DM (only if URL doesn't have /thread/)

    console.log('[DEBUG handleDirectMessageRoute]', {
      dmId,
      threadId,
      shouldKeepThread,
      previousDmId,
      currentThreadInfo: this.threadManagement.threadInfo()
    });
   * 6. Show DM conversation
   *
   * AFTER: DM conversation is displayed, sidebar updated, threads closed if needed
   * NEXT: DM component loads messages, may open thread if URL has /thread/:threadId
   */
  private handleDirectMessageRoute = (dmId: string, threadId?: string): void => {
    const previousDmId = this.navigationService.getSelectedDirectMessageId()();
    const shouldKeepThread = !!threadId; // Keep thread open if URL has /thread/:threadId

    console.log('[DEBUG handleDirectMessageRoute]', {
      dmId,
      threadId,
      shouldKeepThread,
      previousDmId,
      currentThreadInfo: this.threadManagement.threadInfo()
    });

    // Select DM in sidebar AND navigationService state (for browser navigation)
    this.navigationService.selectDirectMessageById(dmId);
    this.closeThreadIfSwitchingDMs(previousDmId, dmId, shouldKeepThread);
    this.closeChannelThreadIfNeeded(); // Close channel thread when switching to DM
    this.showDirectMessage(dmId);
  };

  /**
   * Close thread when switching channels
   *
   * FLOW DOCUMENTATION:
   * BEFORE: User navigates from Channel A to Channel B
   * TRIGGERS: Called by handleChannelRoute() after shouldKeepThreadOpen() check
   *
   * PROCESS:
   * 1. Check if actually switching channels (previousId exists and differs from newId)
   * 2. Check if open thread belongs to PREVIOUS channel (not new channel)
   * 3. Check if thread should be kept open (URL has /thread/ or thread is in new conversation)
   * 4. Close thread only if: switching channels AND thread is in old channel AND should not keep thread
   *
   * CRITICAL LOGIC:
   * - We check threadInfo.channelId === previousId to ensure we only close threads from the OLD channel
   * - We also check !threadInfo.isDirectMessage to ensure this only handles channel threads (not DM threads)
   * - The shouldKeepThread flag prevents closing when URL has /thread/ (deep link navigation)
   * - If shouldKeepThread is true, the thread will remain open OR a new thread will be opened by the conversation component
   *
   * AFTER: Thread is closed if it belonged to the previous channel AND should not be kept
   * NEXT: showChannel() displays the new channel conversation
   */
  private closeThreadIfNeeded = (
    previousId: string | null,
    newId: string,
    shouldKeepThread: boolean
  ): void => {
    const threadInfo = this.threadManagement.threadInfo();
    const isSwitchingChannels = previousId && previousId !== newId;
    const isThreadInPreviousChannel = threadInfo?.channelId === previousId && !threadInfo?.isDirectMessage;

    // Close thread if switching channels AND thread belongs to previous channel
    // Even if new URL has a thread (it's a different thread in a different channel)
    const willClose = isSwitchingChannels && isThreadInPreviousChannel;

    console.log('[DEBUG closeThreadIfNeeded]', {
      previousId,
      newId,
      shouldKeepThread,
      isSwitchingChannels,
      isThreadInPreviousChannel,
      willClose
    });

    if (willClose) {
      this.closeThreadInternal();
    }
  };

  /**
   * Close thread when switching DMs
   *
   * FLOW DOCUMENTATION:
   * BEFORE: User navigates from DM A to DM B
   * TRIGGERS: Called by handleDirectMessageRoute() after shouldKeepThreadOpen() check
   *
   * PROCESS:
   * 1. Check if actually switching DMs (previousDmId exists and differs from newDmId)
   * 2. Check if open thread belongs to PREVIOUS DM (not new DM)
   * 3. Check if thread should be kept open (URL has /thread/ or thread is in new conversation)
   * 4. Close thread only if: switching DMs AND thread is in old DM AND should not keep thread
   *
   * CRITICAL LOGIC:
   * - We check threadInfo.channelId === previousDmId to ensure we only close threads from the OLD DM
   * - We also check threadInfo.isDirectMessage to ensure this only handles DM threads (not channel threads)
   * - The shouldKeepThread flag prevents closing when URL has /thread/ (deep link navigation)
   *
   * AFTER: Thread is closed if it belonged to the previous DM
   * NEXT: showDirectMessage() displays the new DM conversation
   */
  private closeThreadIfSwitchingDMs = (
    previousDmId: string | null,
    newDmId: string,
    shouldKeepThread: boolean
  ): void => {
    const threadInfo = this.threadManagement.threadInfo();
    const isSwitchingDMs = previousDmId && previousDmId !== newDmId;
    const isThreadInPreviousDM = threadInfo?.channelId === previousDmId && threadInfo?.isDirectMessage;

    // Close thread if switching DMs AND thread belongs to previous DM
    // Even if new URL has a thread (it's a different thread in a different DM)
    const willClose = isSwitchingDMs && isThreadInPreviousDM;

    if (willClose) {
      this.closeThreadInternal();
    }
  }

  /**
   * Close Channel thread when switching to DM
   *
   * FLOW DOCUMENTATION:
   * BEFORE: User navigates from Channel to DM (cross-conversation-type navigation)
   * TRIGGERS: Called by handleDirectMessageRoute() to close any open channel threads
   *
   * PROCESS:
   * 1. Check if a channel thread is currently open (threadInfo exists and isDirectMessage === false)
   * 2. Always close channel threads when switching to DM (cross-type navigation)
   * 3. Exception: Keep open only if URL explicitly has /thread/ (shouldKeepThread = true)
   *
   * CRITICAL LOGIC:
   * - This handles cross-type navigation (Channel → DM)
   * - Channel threads are ALWAYS closed when navigating to DM
   * - Exception: Thread-unread-popup navigation with /thread/ in URL
   *
   * AFTER: Channel thread is closed if one was open
   * NEXT: handleDirectMessageRoute() continues to show DM conversation
   */
  private closeChannelThreadIfNeeded = (): void => {
    const threadInfo = this.threadManagement.threadInfo();
    const isChannelThreadOpen = threadInfo && !threadInfo.isDirectMessage;

    console.log('[DEBUG closeChannelThreadIfNeeded]', {
      isChannelThreadOpen,
      threadInfo,
      willClose: isChannelThreadOpen
    });

    // Always close channel threads when switching to DM (URL will handle opening new thread if needed)
    if (isChannelThreadOpen) {
      this.closeThreadInternal();
    }
  };

  /**
   * Close DM thread when switching to Channel
   *
   * FLOW DOCUMENTATION:
   * BEFORE: User navigates from DM to Channel (cross-conversation-type navigation)
   * TRIGGERS: Called by handleChannelRoute() to close any open DM threads
   *
   * PROCESS:
   * 1. Check if a DM thread is currently open (threadInfo exists and isDirectMessage === true)
   * 2. Always close DM threads when switching to Channel (cross-type navigation)
   * 3. Exception: Keep open only if URL explicitly has /thread/ (shouldKeepThread = true)
   *
   * CRITICAL LOGIC:
   * - This handles cross-type navigation (DM → Channel)
   * - DM threads are ALWAYS closed when navigating to Channel
   * - Exception: Thread-unread-popup navigation with /thread/ in URL
   *
   * AFTER: DM thread is closed if one was open
   * NEXT: handleChannelRoute() continues to show channel conversation
   */
  private closeDMThreadIfNeeded = (): void => {
    const threadInfo = this.threadManagement.threadInfo();
    const isDMThreadOpen = threadInfo && threadInfo.isDirectMessage;

    console.log('[DEBUG closeDMThreadIfNeeded]', {
      isDMThreadOpen,
      threadInfo,
      willClose: isDMThreadOpen
    });

    // Always close DM threads when switching to Channel (URL will handle opening new thread if needed)
    if (isDMThreadOpen) {
      this.closeThreadInternal();
    }
  };

  /**
   * Internal thread close helper - closes thread and updates URL
   * This is used by all thread-closing functions to ensure URL stays in sync
   */
  private closeThreadInternal(): void {
    this.threadManagement.closeThread();
    // Note: No need to update URL here because navigation already happened
    // The new route (without /thread/) is already active
  }

  /**
   * Switch to new message view
   */
  showNewMessage(): void {
    // Close thread panel if open
    if (this.threadManagement.isThreadOpen()) {
      this.threadManagement.closeThread();
    }

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
    this.dashboardState.showDirectMessage(conversationId, participants);
  }

  /**
   * Start a direct message conversation with a user
   * Called from profile view or other places
   */
  async startDirectMessageWithUser(userId: string): Promise<void> {
    // Close thread if open before starting new conversation
    if (this.threadManagement.isThreadOpen()) {
      this.threadManagement.closeThread();
    }

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
   *
   * FLOW DOCUMENTATION:
   * BEFORE: User clicks on message thread icon OR thread-unread-popup item
   * TRIGGERS:
   * - Channel/DM conversation component emits threadRequested event
   * - Thread-unread-popup navigates to /channel/:id/thread/:threadId or /dm/:id/thread/:threadId
   *
   * PROCESS:
   * 1. Extract conversation ID and type from event (may come from thread-unread-popup)
   * 2. Get conversation name from stores if conversationId provided
   * 3. Otherwise, get conversation info from current view (channel or DM)
   * 4. Call threadManagement.openThread() to update thread state
   * 5. Thread panel becomes visible in UI
   *
   * CRITICAL SCENARIOS:
   * - Direct click on message: conversationId is undefined, use current view
   * - Thread-unread-popup: conversationId is provided, may differ from current view
   * - After opening, route change effect will run and call handleChannelRoute/handleDirectMessageRoute
   * - Those functions MUST NOT close the thread we just opened (prevented by shouldKeepThread check)
   *
   * AFTER: Thread panel is open, threadInfo signal updated, effect triggers
   * NEXT: Thread component loads and displays thread messages
   */
  openThread(event: {
    messageId: string;
    parentMessage: Message;
    conversationId?: string;
    isDirectMessage?: boolean;
  }): void {
    const isDirectMessage = event.isDirectMessage || false;
    let channelName = '';
    let channelId = event.conversationId || '';

    if (channelId) {
      channelName = this.getConversationName(channelId, isDirectMessage);
    } else {
      const viewData = this.getConversationFromCurrentView();
      channelId = viewData.id;
      channelName = viewData.name;
    }

    this.threadManagement.openThread(
      event.messageId,
      event.parentMessage,
      channelId,
      channelName,
      isDirectMessage
    );

    // Update URL to include /thread/:threadId to prevent thread from being closed by route effect
    const currentUrl = this.router.url;
    const hasThreadInUrl = currentUrl.includes('/thread/');

    if (!hasThreadInUrl) {
      // Add /thread/:messageId to current URL
      const path = isDirectMessage ? 'dm' : 'channel';
      this.router.navigate(['/dashboard', path, channelId, 'thread', event.messageId], { replaceUrl: true });
    }
  }

  /**
   * Get conversation name from stores
   * @param conversationId - Conversation ID
   * @param isDirectMessage - Is direct message
   * @returns Conversation name
   */
  private getConversationName(conversationId: string, isDirectMessage: boolean): string {
    if (isDirectMessage) {
      const dm = this.dashboardState.selectedDM();
      return dm?.userName || '';
    }
    const channel = this.dashboardState.selectedChannel();
    return channel?.name || '';
  }

  /**
   * Get conversation data from current view
   * @returns Conversation ID and name
   */
  private getConversationFromCurrentView(): { id: string; name: string } {
    if (this.currentView() === 'channel' && this.selectedChannel()) {
      return {
        id: this.selectedChannel()!.id,
        name: this.selectedChannel()!.name,
      };
    }
    if (this.currentView() === 'direct-message' && this.selectedDM()) {
      return {
        id: this.selectedDM()!.conversationId,
        name: this.selectedDM()!.userName,
      };
    }
    return { id: '', name: '' };
  }

  /**
   * Close thread view
   */
  closeThread(): void {
    this.threadManagement.closeThread();

    // Remove /thread/:threadId from URL if present
    const currentUrl = this.router.url;
    const hasThreadInUrl = currentUrl.includes('/thread/');

    if (hasThreadInUrl) {
      // Remove /thread/:threadId from URL
      const urlParts = currentUrl.split('/thread/');
      if (urlParts.length > 0) {
        this.router.navigate([urlParts[0]], { replaceUrl: true });
      }
    }
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
