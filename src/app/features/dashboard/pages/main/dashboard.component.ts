/**
 * @fileoverview Dashboard Component
 * @description Main dashboard page handling channels, DMs, threads, and mailbox
 * @module features/dashboard/pages/main/dashboard
 */

import { Component, computed, effect, inject, signal, untracked, ViewChild } from '@angular/core';
import { Router } from '@angular/router';
import { NavigationService } from '@core/services/navigation/navigation.service';
import { WelcomeChannelSelectorService } from '@core/services/workspace-initialization/welcome-channel-selector.service';
import { MobileSearchComponent } from '@shared/components/mobile-search/mobile-search.component';
import { WorkspaceMenuToggleComponent } from '@shared/dashboard-components';
import { type Message } from '@shared/dashboard-components/conversation-messages/conversation-messages.component';
import {
  DashboardInitializationService,
  DashboardRouteHandlerService,
  DashboardStateService,
  DashboardThreadCoordinatorService,
  ResponsivePanelManagementService,
  ResponsiveViewService,
  ThreadManagementService,
  WorkspaceSidebarService,
} from '@shared/services';
import { LegalOverviewComponent } from '../../../legal/components/legal-overview/legal-overview.component';
import { SettingsComponent } from '../../../settings/pages/settings/settings.component';
import { ChannalWelcomeComponent } from '../../components/channal-welcome/channal-welcome.component';
import { ChannelConversationComponent } from '../../components/channel-conversation/channel-conversation.component';
import { ChannelMailboxComponent } from '../../components/channel-mailbox/channel-mailbox.component';
import { ChatNewMsgComponent } from '../../components/chat-new-msg/chat-new-msg.component';
import { ChatPrivateComponent } from '../../components/chat-private/chat-private.component';
import { ThreadComponent } from '../../components/thread/thread.component';
import { WorkspaceHeaderComponent } from '../../components/workspace-header/workspace-header.component';
import { WorkspaceSidebarComponent } from '../../components/workspace-sidebar/workspace-sidebar.component';

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
    SettingsComponent,
    WorkspaceMenuToggleComponent,
  ],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.scss',
})
export class DashboardComponent {
  @ViewChild('sidebar') sidebar!: WorkspaceSidebarComponent;

  protected sidebarService = inject(WorkspaceSidebarService);
  protected responsiveView = inject(ResponsiveViewService);
  protected dashboardState = inject(DashboardStateService);
  protected dashboardInit = inject(DashboardInitializationService);
  protected threadManagement = inject(ThreadManagementService);
  protected navigationService = inject(NavigationService);
  protected router = inject(Router);
  private routeHandler = inject(DashboardRouteHandlerService);
  private threadCoordinator = inject(DashboardThreadCoordinatorService);
  private panelManager = inject(ResponsivePanelManagementService);
  private welcomeSelector = inject(WelcomeChannelSelectorService);

  // Expose state from services for template
  protected currentView = this.dashboardState.currentView;
  protected selectedChannel = this.dashboardState.selectedChannel;
  protected selectedDM = this.dashboardState.selectedDM;
  protected isThreadOpen = this.threadManagement.isThreadOpen;
  protected threadInfo = this.threadManagement.threadInfo;

  // Mobile view state management
  protected isMobileView = this.responsiveView.isMobile;
  protected mobileActiveView = signal<'sidebar' | 'content' | 'thread'>('sidebar');
  private wasMobileView = signal<boolean>(this.responsiveView.isMobile());

  // Computed: Should show each section on mobile
  protected showSidebarMobile = computed(
    () => !this.isMobileView() || this.mobileActiveView() === 'sidebar',
  );
  protected showContentMobile = computed(
    () => !this.isMobileView() || this.mobileActiveView() === 'content',
  );
  protected showThreadMobile = computed(
    () => !this.isMobileView() || this.mobileActiveView() === 'thread',
  );

  // Computed: Sidebar priority mode (1024-1280px with sidebar open and thread open)
  protected isSidebarPriorityMode = computed(() => {
    const viewportWidth = this.responsiveView.viewportWidth();
    const isThreadOpen = this.isThreadOpen();
    const isSidebarOpen = !this.sidebarService.isHidden();

    return (
      viewportWidth >= 1024 &&
      viewportWidth < 1280 &&
      isThreadOpen &&
      isSidebarOpen &&
      !this.isMobileView()
    );
  });

  constructor() {
    this.dashboardInit.initializeEffects();
    this.setupRouteListener();
    this.setupResponsiveSidebar();
    this.setupThreadMobileEffect();
    this.setupContentMobileEffect();
    this.setupMobileToDesktopTransition();
    this.panelManager.setupEffects();
  }

  /**
   * Handle mobile sidebar visibility
   * @description Keeps mobile sidebar recovery in the page shell so breakpoint changes cannot leave navigation unreachable.
   * Shows sidebar on mobile to let CSS control visibility
   * @private
   * @returns {void}
   */
  private handleMobileSidebarVisibility = (): void => {
    if (this.sidebarService.isHidden()) {
      this.sidebarService.show();
    }
  };

  /**
   * Handle desktop sidebar collapse
   * @description Centralizes desktop collapse behavior so breakpoint-driven layout changes stay consistent across routes.
   * Auto-collapses sidebar at 1440px breakpoint
   * @private
   * @param {boolean} shouldCollapse - Whether sidebar should collapse
   * @returns {void}
   */
  private handleDesktopSidebarCollapse = (shouldCollapse: boolean): void => {
    if (shouldCollapse && !this.sidebarService.isHidden()) {
      this.sidebarService.hide();
    } else if (!shouldCollapse && this.sidebarService.isHidden()) {
      this.sidebarService.show();
    }
  };

  /**
   * Setup responsive sidebar auto-collapse effect
   * @description Owns viewport-to-layout orchestration at the shell level so child components remain unaware of responsive rules.
   * Automatically collapses/expands sidebar based on viewport width
   * Only applies on non-mobile viewports (>= 768px)
   * @private
   * @returns {void}
   */
  private setupResponsiveSidebar = (): void => {
    effect(() => {
      const shouldCollapse = this.responsiveView.shouldCollapseSidebar();
      const isMobile = this.isMobileView();

      untracked(() => {
        isMobile
          ? this.handleMobileSidebarVisibility()
          : this.handleDesktopSidebarCollapse(shouldCollapse);
      });
    });
  };

  /**
   * Setup thread mobile effect
   * @description Forces the mobile panel stack to prioritize thread context when a thread opens, preventing hidden active content.
   * Switches to thread view when thread opens on mobile
   * @private
   * @returns {void}
   */
  private setupThreadMobileEffect = (): void => {
    effect(() => {
      if (this.isMobileView() && this.isThreadOpen()) {
        untracked(() => this.mobileActiveView.set('thread'));
      }
    });
  };

  /**
   * Setup content mobile effect
   * @description Synchronizes view-based navigation with the mobile content pane so route changes immediately reflect in layout state.
   * Switches to content view for various content types on mobile
   * @private
   * @returns {void}
   */
  private setupContentMobileEffect = (): void => {
    effect(() => {
      const view = this.currentView();
      const isContentView = this.isContentView(view);

      if (this.isMobileView() && !this.isThreadOpen() && isContentView) {
        untracked(() => this.mobileActiveView.set('content'));
      }
    });
  };

  /**
   * Check if view is a content view type
   * @description Encapsulates the shell's notion of content-capable views so panel-switching rules are maintained in one place.
   * @private
   * @param {string} view - Current view name
   * @returns {boolean} True if view is content type
   */
  private isContentView = (view: string): boolean => {
    const contentViews = [
      'channel',
      'direct-message',
      'chat-new-msg',
      'mailbox',
      'legal',
      'welcome',
    ];
    return contentViews.includes(view);
  };

  /**
   * Setup mobile to desktop transition effect
   * @description Preserves cross-breakpoint navigation continuity so desktop mode always restores a valid content view after leaving mobile-only states.
   * Opens welcome channel when transitioning from mobile without content
   * @private
   * @returns {void}
   */
  private setupMobileToDesktopTransition = (): void => {
    effect(() => {
      const isMobile = this.isMobileView();
      const wasMobile = this.wasMobileView();
      const currentView = this.currentView();
      const hasThread = this.isThreadOpen();

      untracked(() => {
        const transitionedToDesktop = wasMobile && !isMobile;
        const hasNoContent = currentView === 'none' || currentView === 'welcome';

        if (transitionedToDesktop && hasNoContent && !hasThread) {
          const welcomeId = this.dashboardState.navigateToWelcome();
          if (welcomeId && this.sidebar) {
            this.sidebar.selectChannelById(welcomeId);
          }
        }

        this.wasMobileView.set(isMobile);
      });
    });
  };

  /**
   * Setup route parameter listener
   * @description Keeps route-param reactivity in one shell-level effect so navigation-driven view changes are handled uniformly.
   * Creates an effect that watches route parameter changes and handles routing
   * @private
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
   * @description Delegates route interpretation to a dedicated handler so page-shell responsibilities stay focused on wiring and state handoff.
   * Delegates route handling to route handler service
   * @private
   * @param {any} params - Route parameters from navigation service
   * @returns {void}
   */
  private handleRouteChange = (params: any): void => {
    this.routeHandler.handleRouteChange(params, {
      showWelcome: this.showWelcome,
      showMailbox: this.showMailbox,
      showLegal: this.showLegal,
      showSettings: this.showSettings,
      showChannel: this.showChannel,
      showDirectMessage: this.showDirectMessage,
    });
  };

  /**
   * Show new message view - Closes thread and displays new message composition
   * @description Switches shell state to compose mode and ensures thread/mobile content context is normalized before rendering.
   * @returns {void}
   */
  showNewMessage = (): void => {
    if (this.threadManagement.isThreadOpen()) this.threadManagement.closeThread();
    if (this.isMobileView()) this.mobileActiveView.set('content');
    this.dashboardState.showNewMessage();
  };

  /**
   * Show welcome view.
   * @description Routes to the welcome surface through dashboard state so initial workspace context always resets to a neutral landing view.
   * @returns {void}
   */
  showWelcome = (): void => {
    if (this.isMobileView()) this.mobileActiveView.set('content');
    this.dashboardState.showWelcome();
  };

  /**
   * Show mailbox view.
   * @description Activates mailbox mode through the shared state service so mention and notification workflows reuse one navigation path.
   * @returns {void}
   */
  showMailbox = (): void => {
    if (this.isMobileView()) this.mobileActiveView.set('content');
    this.dashboardState.showMailbox();
  };

  /**
   * Show legal view.
   * @description Switches content context to legal information while preserving shell-level mobile view behavior.
   * @returns {void}
   */
  showLegal = (): void => {
    if (this.isMobileView()) this.mobileActiveView.set('content');
    this.dashboardState.showLegal();
  };

  /**
   * Show settings view.
   * @description Navigates to settings through centralized dashboard state so preference screens follow the same shell transition rules.
   * @returns {void}
   */
  showSettings = (): void => {
    if (this.isMobileView()) this.mobileActiveView.set('content');
    this.dashboardState.showSettings();
  };

  /**
   * Open a channel by ID.
   * @description Keeps channel-open calls funneled through showChannel so sidebar shortcuts and route handlers share identical transition behavior.
   * @param {string} channelId - Channel ID to open
   * @returns {void}
   */
  openChannelById = (channelId: string): void => this.showChannel(channelId);

  /**
   * Show channel - Displays channel and deselects active DM
   * @description Opens the selected channel and clears DM selection to avoid mixed conversation context in the shell.
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
   * @description Opens DM context in dashboard state while preserving mobile content focus behavior.
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
   * @description Starts or reuses a DM via sidebar orchestration and navigates to the resolved conversation route.
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
   * @description Forwards thread-open events to the coordinator so state and URL synchronization stay centralized.
   * @param {Object} event - Thread request event with messageId, parentMessage, conversationId, isDirectMessage
   * @returns {void}
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
   * Close thread - On mobile, return to content view
   * @description Closes active thread context and restores mobile content panel visibility when needed.
   * @returns {void}
   */
  closeThread = (): void => {
    this.threadCoordinator.closeThread();
    if (this.isMobileView()) this.mobileActiveView.set('content');
  };

  /**
   * Navigate back to sidebar on mobile - Closes thread/channel and shows sidebar
   * @description Resets conversation selection and shell state to sidebar-first mobile navigation baseline.
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
   * @description Redirects to the welcome channel after leave operations so the dashboard never stays on an invalid channel.
   * @returns {void}
   */
  onChannelLeft = (): void => {
    const welcomeId = this.dashboardState.navigateToWelcome();
    if (welcomeId && this.sidebar) this.sidebar.selectChannelById(welcomeId);
  };

  /** Navigate to channel by ID (e.g., #channel mention) @param {string} channelId @returns {void} */
  navigateToChannel = (channelId: string): void =>
    this.navigationService.navigateToChannel(channelId);
}
