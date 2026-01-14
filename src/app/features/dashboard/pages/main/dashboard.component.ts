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
   * Component initialization
   * @description Initializes dashboard effects and sets up route listener
   */
  constructor() {
    this.dashboardInit.initializeEffects();
    this.setupRouteListener();
    this.checkMobileView();
    this.setupMobileViewEffects();
  }

  /**
   * Listen to window resize events
   * @description Updates mobile view state on window resize
   */
  @HostListener('window:resize')
  onResize(): void {
    this.checkMobileView();
  }

  /**
   * Check if current viewport is mobile
   * @description Updates isMobileView signal based on window width
   */
  private checkMobileView(): void {
    this.isMobileView.set(window.innerWidth < 768);
  }

  /**
   * Setup mobile view effects
   * @description Watches for view changes and updates mobile active view
   */
  private setupMobileViewEffects(): void {
    // When thread opens on mobile, switch to thread view
    effect(() => {
      if (this.isMobileView() && this.isThreadOpen()) {
        untracked(() => this.mobileActiveView.set('thread'));
      }
    });


    // When view changes to content (channel/DM), switch to content view on mobile
    // BUT: Only if thread is NOT open (otherwise thread view takes priority)
    effect(() => {
      const view = this.currentView();
      if (this.isMobileView() &&
          !this.isThreadOpen() &&
          (view === 'channel' || view === 'direct-message' ||
           view === 'chat-new-msg' || view === 'mailbox' ||
           view === 'legal' || view === 'welcome')) {
        untracked(() => this.mobileActiveView.set('content'));
      }
    });
  }

  //   // When view changes to content (channel/DM), switch to content view on mobile
  //   // BUT: Only if user explicitly selected something (not on initial load)
  //   effect(() => {
  //     const view = this.currentView();
  //     const isMobile = this.isMobileView();
  //     const currentMobileView = this.mobileActiveView();

  //     // Only switch to content if:
  //     // 1. We are on mobile
  //     // 2. A channel or DM is selected (not welcome)
  //     // 3. OR user explicitly requested a specific view (new-msg, mailbox, legal)
  //     if (isMobile && currentMobileView === 'sidebar') {
  //       if (view === 'channel' || view === 'direct-message' ||
  //           view === 'chat-new-msg' || view === 'mailbox' ||
  //           view === 'legal') {
  //         untracked(() => this.mobileActiveView.set('content'));
  //       }
  //     }
  //   });
  // }

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
   * On mobile, return to content view when thread closes
   * @description Delegates thread closing to thread coordinator service
   * @returns void
   */
  closeThread = (): void => {
    this.threadCoordinator.closeThread();

    if (this.isMobileView()) {
      this.mobileActiveView.set('content');
    }
  };

  /**
   * Navigate back to sidebar on mobile
   * @description Returns to sidebar view on mobile devices
   * @returns void
   */
  backToSidebar = (): void => {
    this.mobileActiveView.set('sidebar');

    if (this.isThreadOpen()) {
      this.closeThread();
    }
  };

  /**
   * Navigate back to content on mobile
   * @description Returns to content view from thread on mobile devices
   * @returns void
   */
  backToContent = (): void => {
    this.mobileActiveView.set('content');
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
