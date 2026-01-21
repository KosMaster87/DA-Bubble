/**
 * @fileoverview Dashboard Component
 * @description Main dashboard page handling channels, DMs, threads, and mailbox
 * @module features/dashboard/pages/main/dashboard
 */

import { Component, inject, ViewChild, effect, untracked, signal, computed, HostListener } from '@angular/core';
import { Router } from '@angular/router';
import { WorkspaceHeaderComponent } from '../../components/workspace-header/workspace-header.component';
import { WorkspaceSidebarComponent } from '../../components/workspace-sidebar/workspace-sidebar.component';
import { WorkspaceMenuToggleComponent } from '@shared/dashboard-components';
import { MobileSearchComponent } from '@shared/components/mobile-search/mobile-search.component';
import { WorkspaceSidebarService } from '@shared/services/workspace-sidebar.service';
import { DashboardStateService } from '@shared/services/dashboard-state.service';
import { DashboardInitializationService } from '@shared/services/dashboard-initialization.service';
import { ThreadManagementService } from '@shared/services/thread-management.service';
import { DashboardRouteHandlerService } from '@shared/services/dashboard-route-handler.service';
import { DashboardThreadCoordinatorService } from '@shared/services/dashboard-thread-coordinator.service';
import { WelcomeChannelSelectorService } from '@core/services/workspace-initialization/welcome-channel-selector.service';
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
    MobileSearchComponent,
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
  private welcomeSelector = inject(WelcomeChannelSelectorService);

  // Expose state from services for template
  protected currentView = this.dashboardState.currentView;
  protected selectedChannel = this.dashboardState.selectedChannel;
  protected selectedDM = this.dashboardState.selectedDM;
  protected isThreadOpen = this.threadManagement.isThreadOpen;
  protected threadInfo = this.threadManagement.threadInfo;

  // Mobile view state management
  protected isMobileView = signal<boolean>(false);
  protected mobileActiveView = signal<'sidebar' | 'content' | 'thread'>('sidebar');

  // Computed: Should show each section on mobile
  protected showSidebarMobile = computed(() =>
    !this.isMobileView() || this.mobileActiveView() === 'sidebar'
  );
  protected showContentMobile = computed(() =>
    !this.isMobileView() || this.mobileActiveView() === 'content'
  );
  protected showThreadMobile = computed(() =>
    !this.isMobileView() || this.mobileActiveView() === 'thread'
  );

  /**
   * Check if current viewport is mobile
   * Updates isMobileView signal based on window width
   * @returns {void}
   */
  private checkMobileView = (): void => {
    this.isMobileView.set(window.innerWidth < 768);
  };

  /**
   * Setup mobile view effects
   * Watches for view changes and updates mobile active view
   * @returns {void}
   */
  private setupMobileViewEffects = (): void => {
    effect(() => {
      if (this.isMobileView() && this.isThreadOpen()) {
        untracked(() => this.mobileActiveView.set('thread'));
      }
    });

    effect(() => {
      const view = this.currentView();
      if (this.isMobileView() && !this.isThreadOpen() &&
          (view === 'channel' || view === 'direct-message' ||
           view === 'chat-new-msg' || view === 'mailbox' ||
           view === 'legal' || view === 'welcome')) {
        untracked(() => this.mobileActiveView.set('content'));
      }
    });
  };

  /**
   * Setup route parameter listener
   * Creates an effect that watches route parameter changes and handles routing
   * @returns {void}
   */
  private setupRouteListener = (): void => {
    effect(() => {
      const params = this.navigationService.getRouteParams()();
      untracked(() => this.handleRouteChange(params));
    });
  };

  /**
   * Handle route parameter changes
   * Delegates route handling to route handler service
   * @param {any} params - Route parameters from navigation service
   * @returns {void}
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
   * Initialize dashboard effects
   */
  private initEffects = (() => {
    this.dashboardInit.initializeEffects();
    this.setupRouteListener();
    this.checkMobileView();
    this.setupMobileViewEffects();
  })();

  /**
   * Listen to window resize events
   * Updates mobile view state on window resize
   * @returns {void}
   */
  @HostListener('window:resize')
  onResize = (): void => {
    this.checkMobileView();
  };

  /**
   * Show new message view - Closes thread and displays new message composition
   * @returns {void}
   */
  showNewMessage = (): void => {
    if (this.threadManagement.isThreadOpen()) this.threadManagement.closeThread();
    this.dashboardState.showNewMessage();
  };

  /** Show welcome view @returns {void} */
  showWelcome = (): void => this.dashboardState.showWelcome();

  /** Show mailbox view @returns {void} */
  showMailbox = (): void => this.dashboardState.showMailbox();

  /** Show legal view @returns {void} */
  showLegal = (): void => this.dashboardState.showLegal();

  /** Open channel by ID - Delegates to showChannel @param {string} channelId @returns {void} */
  openChannelById = (channelId: string): void => this.showChannel(channelId);

  /**
   * Show channel - Displays channel and deselects active DM
   * @param {string} channelId - Unique identifier of the channel
   * @returns {void}
   */
  showChannel = (channelId: string): void => {
    if (this.isMobileView()) this.mobileActiveView.set('content');
    this.dashboardState.showChannel(channelId, () => {
      if (this.sidebar) this.sidebar.deselectDirectMessage();
    });
  };

  /**
   * Show direct message conversation
   * @param {string} conversationId - Unique identifier of the DM conversation
   * @param {[string, string]} [participants] - Optional tuple of participant user IDs
   * @returns {void}
   */
  showDirectMessage = (conversationId: string, participants?: [string, string]): void => {
    if (this.isMobileView()) this.mobileActiveView.set('content');
    this.dashboardState.showDirectMessage(conversationId, participants);
  };

  /**
   * Start direct message with user - Creates or opens existing DM
   * @param {string} userId - Unique identifier of the user to message
   * @returns {Promise<void>}
   */
  startDirectMessageWithUser = async (userId: string): Promise<void> => {
    if (this.threadManagement.isThreadOpen()) this.threadManagement.closeThread();
    if (!this.sidebar) return;
    const conversation = await this.sidebar.startDirectMessage(userId);
    if (conversation) this.router.navigate(['/dashboard', 'dm', conversation.id]);
  };

  /**
   * Open thread - Delegates to thread coordinator
   * @param {Object} event - Thread request event with messageId, parentMessage, conversationId, isDirectMessage
   * @returns {void}
   */
  openThread = (event: { messageId: string; parentMessage: Message; conversationId?: string; isDirectMessage?: boolean; }): void => {
    this.threadCoordinator.openThread(event);
  };

  /**
   * Close thread - On mobile, return to content view
   * @returns {void}
   */
  closeThread = (): void => {
    this.threadCoordinator.closeThread();
    if (this.isMobileView()) this.mobileActiveView.set('content');
  };

  /**
   * Navigate back to sidebar on mobile - Closes thread/channel and shows sidebar
   * @returns {void}
   */
  backToSidebar = (): void => {
    this.mobileActiveView.set('sidebar');
    if (this.isThreadOpen()) this.threadCoordinator.closeThread();
    this.dashboardState.clearAllViews();
    this.navigationService.clearSelection();
    this.welcomeSelector.suppressAutoSelection();
    this.router.navigate(['/dashboard']);
  };

  /** Navigate back to content on mobile @returns {void} */
  backToContent = (): void => this.mobileActiveView.set('content');

  /**
   * Handle channel left event - Navigates to welcome channel
   * @returns {void}
   */
  onChannelLeft = (): void => {
    const welcomeId = this.dashboardState.navigateToWelcome();
    if (welcomeId && this.sidebar) this.sidebar.selectChannelById(welcomeId);
  };

  /** Navigate to channel by ID (e.g., #channel mention) @param {string} channelId @returns {void} */
  navigateToChannel = (channelId: string): void => this.navigationService.navigateToChannel(channelId);
}
