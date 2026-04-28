/**
 * @fileoverview Workspace Sidebar Component
 * @description Collapsible sidebar showing channels, direct messages and workspace navigation
 * @module features/dashboard/components/workspace-sidebar
 */

import { CommonModule } from '@angular/common';
import { Component, computed, effect, inject, input, output, signal } from '@angular/core';
import { AddMemberAfterAddChannelComponent } from '@app/shared/dashboard-components/add-member-after-add-channel/add-member-after-add-channel.component';
import { type Message as PopupMessage } from '@core/models/message.model';
import { ChannelListService } from '@core/services/channel-list/channel-list.service';
import { ChannelManagementService } from '@core/services/channel-management/channel-management.service';
import { normalizeDirectMessageId } from '@core/services/direct-message-list/direct-message-id.helper';
import {
  DirectMessageListService,
  type DirectMessageListItem,
} from '@core/services/direct-message-list/direct-message-list.service';
import { MailboxBadgeService } from '@core/services/mailbox-badge/mailbox-badge.service';
import { NavigationService } from '@core/services/navigation/navigation.service';
import { UserTransformationService } from '@core/services/user-transformation/user-transformation.service';
import { WorkspaceInitializationService } from '@core/services/workspace-initialization/workspace-initialization.service';
import { type Message as ViewMessage } from '@shared/dashboard-components/conversation-messages/conversation-messages.component';
import { CreateChannelComponent } from '@shared/dashboard-components/create-channel/create-channel.component';
import { ThreadUnreadPopupComponent } from '@shared/dashboard-components/thread-unread-popup/thread-unread-popup.component';
import { WorkspaceSidebarService } from '@shared/services/workspace-sidebar.service';
import { AuthStore } from '@stores/auth';
import { UserPresenceStore } from '@stores/index';
import {
  buildChannelAriaLabel,
  buildDirectMessageAriaLabel,
  buildMailboxAriaLabel,
} from './aria-label.helper';
import {
  formatBadgeCount,
  getVisibleUnreadMessageCount,
  getVisibleUnreadThreadCount,
} from './unread-visibility.helper';

interface VisibleDirectMessageListItem extends DirectMessageListItem {
  isActive: boolean;
  visibleUnreadMessageCount: number;
  visibleUnreadThreadCount: number;
}

@Component({
  selector: 'app-workspace-sidebar',
  imports: [
    CommonModule,
    CreateChannelComponent,
    AddMemberAfterAddChannelComponent,
    ThreadUnreadPopupComponent,
  ],
  templateUrl: './workspace-sidebar.component.html',
  styleUrl: './workspace-sidebar.component.scss',
})
export class WorkspaceSidebarComponent {
  protected authStore = inject(AuthStore);
  protected userPresenceStore = inject(UserPresenceStore);
  protected channelListService = inject(ChannelListService);
  protected directMessageListService = inject(DirectMessageListService);
  protected channelManagementService = inject(ChannelManagementService);
  protected navigationService = inject(NavigationService);
  protected userTransformationService = inject(UserTransformationService);
  protected workspaceSidebarService = inject(WorkspaceSidebarService);
  protected mailboxBadgeService = inject(MailboxBadgeService);
  protected workspaceInitializationService = inject(WorkspaceInitializationService);
  private pendingDirectMessageId = signal<string | null>(null);

  // Inputs
  isNewMessageActive = input<boolean>(false);
  isMailboxActive = input<boolean>(false);
  isLegalActive = input<boolean>(false);
  isSettingsActive = input<boolean>(false);
  isMobileView = input<boolean>(false);

  // Outputs
  newMessageRequested = output<void>();
  mailboxRequested = output<void>();
  channelSelected = output<string>();
  directMessageSelected = output<string>();
  threadOpened = output<{
    messageId: string;
    parentMessage: ViewMessage;
    conversationId: string;
    isDirectMessage: boolean;
  }>();

  /**
   * Channels from ChannelListService - sorted with DABubble-welcome first, Let's Bubble second, then alphabetically
   * @description Exposes pre-sorted channel state so ordering rules are enforced once and not reimplemented in template logic.
   * Includes unread badge calculation
   */
  protected sortedChannels = this.channelListService.getVisibleChannels();

  /**
   * Selected channel ID (from NavigationService)
   * @description Mirrors navigation selection as a signal so row highlighting stays route-driven and resilient to hard reloads.
   */
  protected selectedChannelId = this.navigationService.getSelectedChannelId();

  /**
   * Check if mailbox has unread messages or pending invitations (from MailboxBadgeService)
   * @description
   * We expose both boolean and numeric forms so template bindings can avoid recomputing
   * badge presence and count independently.
   */
  protected hasMailboxUnread = this.mailboxBadgeService.hasUnread;
  protected mailboxUnreadCount = this.mailboxBadgeService.unreadCount;

  /**
   * Direct messages from DirectMessageListService with self-DM (Notes to self) at the top
   * @description Keeps DM ordering and inclusion policy service-driven so the sidebar only renders prepared view data.
   * Shows all DM conversations sorted alphabetically with unread badges
   */
  protected directMessages = this.directMessageListService.getConversationsWithSelfDM();

  /**
   * Selected direct message ID (from NavigationService)
   * @description
   * Route params are read alongside navigation state to survive deep links and hard reloads.
   */
  protected selectedDirectMessageId = this.navigationService.getSelectedDirectMessageId();
  protected routeParams = this.navigationService.getRouteParams();

  /**
   * Normalize the globally confirmed active DM ID from navigation state or route params.
   * @returns {string | null} Canonical DM ID once navigation state or URL confirms the selection
   * @description
   * This computed deliberately excludes the pending click state. It represents only confirmed
   * activation sources so the cleanup effect can decide when the optimistic pending state is no
   * longer needed.
   */
  protected confirmedDirectMessageId = computed((): string | null => {
    const selectedDirectMessageId = this.selectedDirectMessageId();
    if (selectedDirectMessageId) {
      return this.normalizeDirectMessageIdLocal(selectedDirectMessageId);
    }

    const params = this.routeParams();
    return params.path === 'dm' && params.id ? this.normalizeDirectMessageIdLocal(params.id) : null;
  });

  /**
   * Resolve the effective active DM ID the sidebar should render against.
   * @returns {string | null} Canonical DM ID that should suppress unread visuals right now
   * @description
   * The sidebar prefers the pending click state over confirmed navigation state so the unread badge
   * disappears immediately on click. Once navigation or router state catches up, the effect below
   * clears the pending ID and the computed falls back to the confirmed source of truth.
   */
  protected activeDirectMessageId = computed((): string | null => {
    return this.pendingDirectMessageId() ?? this.confirmedDirectMessageId();
  });

  /**
   * Project raw DM items into the exact render state the sidebar needs.
   * @returns {VisibleDirectMessageListItem[]} Sidebar-ready DM items with active-aware unread state
   * @description
   * This keeps the template simple and avoids recalculating visibility logic across several class,
   * badge, and ARIA bindings. The service still exposes raw unread counters, while the component
   * owns the presentation rule for hiding them on the active row.
   */
  protected visibleDirectMessages = computed((): VisibleDirectMessageListItem[] => {
    const directMessages = this.directMessages();
    const activeDirectMessageId = this.activeDirectMessageId();

    return directMessages.map((directMessage) =>
      this.buildVisibleDirectMessageItem(directMessage, activeDirectMessageId),
    );
  });

  /**
   * All users from UserStore mapped to UserListItem for add-member popup (from UserTransformationService)
   * @description Provides popup-ready user projection so channel-member flows can reuse one normalized list shape.
   */
  protected allUsers = this.userTransformationService.getUserList();

  constructor() {
    // Initialize workspace (load stores and setup auto-selection)
    this.workspaceInitializationService.initialize((channelId) => {
      this.channelSelected.emit(channelId);
    });

    // Keep pending DM selection only until global state or URL confirms the selection.
    effect(() => {
      const pendingDirectMessageId = this.pendingDirectMessageId();
      if (!pendingDirectMessageId) return;

      if (this.confirmedDirectMessageId() === pendingDirectMessageId) {
        this.pendingDirectMessageId.set(null);
      }
    });
  }

  /**
   * Open the new-message composer view.
   * @description Triggers compose navigation and emits the same intent upward so parent layout state and route state stay in sync.
   * @returns {void}
   */
  openNewMessage = (): void => {
    this.navigationService.selectNewMessage();
    this.newMessageRequested.emit();
  };

  /**
   * Open mailbox view.
   * @description Emits mailbox intent without coupling sidebar actions to mailbox implementation details.
   * @returns {void}
   */
  openMailbox = (): void => this.mailboxRequested.emit();

  /**
   * Toggle channel section collapse state.
   * @description Delegates section visibility state to sidebar service so accordion behavior remains centralized.
   * @returns {void}
   */
  toggleChannels = (): void => this.workspaceSidebarService.toggleChannels();

  /**
   * Toggle direct-message section collapse state.
   * @description Keeps DM list expansion logic in one shared service path used by all sidebar interaction points.
   * @returns {void}
   */
  toggleDirectMessages = (): void => this.workspaceSidebarService.toggleDirectMessages();

  /**
   * Toggle system-control section collapse state.
   * @description Routes system-section expansion through the sidebar service so state survives component-level render churn.
   * @returns {void}
   */
  toggleSystemControl = (): void => this.workspaceSidebarService.toggleSystemControl();

  /**
   * Open legal information page.
   * @description Uses navigation service to preserve global routing behavior and tracking hooks for legal navigation.
   * @returns {void}
   */
  openLegal = (): void => this.navigationService.navigateToLegal();

  /**
   * Open workspace settings page.
   * @description Delegates settings navigation to the central navigation service so route transitions stay consistent with other sidebar actions.
   * @returns {void}
   */
  openSettings = (): void => {
    this.navigationService.navigateToSettings();
  };

  /**
   * Select a channel or special view (mailbox, etc.)
   * Delegates to NavigationService for routing and state management
   * @param {string} channelId - Channel ID to select
   * @returns {void}
   * @description
   * Clearing pending DM state here prevents stale optimistic DM selection from affecting
   * channel badge visibility after cross-navigation.
   */
  selectChannel = (channelId: string): void => {
    this.pendingDirectMessageId.set(null);
    this.workspaceInitializationService.resetAutoSelectSuppression();
    this.navigationService.selectChannel(channelId);
    this.channelSelected.emit(channelId);
  };

  /**
   * Select channel by ID via navigation service.
   * @description Exposes a narrow forwarding path for template bindings that already resolve channel IDs.
   * @param {string} channelId - Target channel ID
   * @returns {void}
   */
  selectChannelById = (channelId: string): void =>
    this.navigationService.selectChannelById(channelId);

  /**
   * Select direct message by ID via navigation service.
   * @description Keeps ID-based DM navigation as a dedicated API so callers do not depend on full DM object shapes.
   * @param {string} messageId - Target direct message ID
   * @returns {void}
   */
  selectDirectMessageById = (messageId: string): void =>
    this.navigationService.selectDirectMessageById(messageId);

  /**
   * Clear active direct-message selection.
   * @description Provides an explicit deselect action for transitions where no DM should stay active.
   * @returns {void}
   */
  deselectDirectMessage = (): void => this.navigationService.deselectDirectMessage();

  /**
   * Open create-channel flow.
   * @description Starts the staged channel-creation UI in the sidebar service so modal state remains centralized.
   * @returns {void}
   */
  addChannel = (): void => this.workspaceSidebarService.startAddChannel();

  /**
   * Close create-channel modal.
   * @description Delegates closure to sidebar service to keep modal lifecycle rules in one state owner.
   * @returns {void}
   */
  onCreateChannelClose = (): void => this.workspaceSidebarService.closeCreateChannel();

  /**
   * Close add-member-after-channel modal.
   * @description Uses the sidebar service close path so staged channel creation can be cancelled consistently.
   * @returns {void}
   */
  onClose = (): void => this.workspaceSidebarService.closeAddMemberAfterChannel();

  /**
   * Handle create channel submit
   * @description Captures the first step of channel creation into pending state so member selection can run before final persistence.
   * @param {Object} data - Channel data
   * @param {string} data.name - Channel name
   * @param {string} data.description - Channel description
   * @param {boolean} data.isPrivate - Whether channel is private
   * @returns {void}
   */
  onCreateChannel = (data: { name: string; description: string; isPrivate: boolean }): void => {
    this.workspaceSidebarService.setPendingChannelData(data.name, data.description, data.isPrivate);
    this.workspaceSidebarService.closeCreateChannel();
    this.workspaceSidebarService.openAddMemberAfterChannel();
  };

  /**
   * Handle add member after channel create - create channel and send invitations
   * @description Finalizes the staged channel flow in one place so creation, invitations, and auto-selection remain transactionally aligned.
   * @param {Object} data - Channel creation data
   * @returns {Promise<void>}
   */
  async onCreate(data: {
    type: 'all' | 'specific';
    searchValue?: string;
    selectedChannels: Array<{ id: string; name: string }>;
    selectedUsers: Array<{ id: string; name: string; avatar: string }>;
  }): Promise<void> {
    const currentUserId = this.authStore.user()?.uid;
    if (!currentUserId) return;

    // Create channel from pending data via ChannelManagementService
    // (includes lock, cleanup, and auto-selection)
    const newChannelId = await this.channelManagementService.createChannelFromPending(
      data,
      currentUserId,
    );

    if (!newChannelId) return; // Locked or failed

    // Notify parent component
    this.channelSelected.emit(newChannelId);
  }

  /**
   * Select a direct message (handles self-DM automatically)
   * @param {string} messageId - Direct message ID to select
   * @returns {Promise<void>}
   * @description
   * The sidebar sets a local pending ID before the async DM resolution starts so unread visuals
   * can disappear in the same click cycle. This mirrors the channel behavior, where selection is
   * synchronous, and prevents a DM-specific lag while self-DMs and navigation state catch up.
   */
  selectDirectMessage = async (messageId: string): Promise<void> => {
    const currentUserId = this.authStore.user()?.uid;
    if (!currentUserId) return;

    // Suppress unread visuals immediately while async DM selection resolves.
    this.pendingDirectMessageId.set(this.normalizeDirectMessageIdLocal(messageId));

    this.workspaceInitializationService.resetAutoSelectSuppression();

    const actualConversationId = await this.directMessageListService.selectConversation(
      messageId,
      currentUserId,
    );

    if (!actualConversationId) return;
    this.navigationService.selectDirectMessage(actualConversationId);
    this.directMessageSelected.emit(actualConversationId);
  };

  /**
   * Start or open a direct message conversation with a user
   * @description Consolidates DM bootstrap and selection so sidebar interactions produce one consistent conversation-entry flow.
   * @param {string} userId - The other user's ID
   * @returns {Promise<{id: string, participants: string[]} | null>} Conversation data or null
   */
  startDirectMessage = async (
    userId: string,
  ): Promise<{ id: string; participants: string[] } | null> => {
    const currentUserId = this.authStore.user()?.uid;
    if (!currentUserId) return null;

    const conversation = await this.directMessageListService.startAndSelectConversation(
      currentUserId,
      userId,
    );

    return conversation;
  };

  /**
   * Handle thread click from popup
   * @description Adapts popup thread events to the global thread-open contract so parent shells receive consistent payload structure.
   * @param {Object} event - Thread event data
   * @param {string} event.messageId - Message ID
   * @param {PopupMessage} event.parentMessage - Parent message
   * @param {string} event.conversationId - Conversation ID
   * @param {boolean} event.isDirectMessage - Is direct message flag
   * @param {boolean} isDirectMessage - Direct message flag
   * @returns {Promise<void>}
   */
  onThreadClick = async (
    event: {
      messageId: string;
      parentMessage: PopupMessage;
      conversationId: string;
      isDirectMessage: boolean;
    },
    isDirectMessage: boolean,
  ): Promise<void> => {
    const { viewMessage } = this.navigationService.handleThreadClick(
      {
        conversationId: event.conversationId,
        messageId: event.messageId,
        message: event.parentMessage,
      },
      event.isDirectMessage,
    );

    this.threadOpened.emit({
      messageId: event.messageId,
      parentMessage: viewMessage,
      conversationId: event.conversationId,
      isDirectMessage: event.isDirectMessage,
    });
  };

  /**
   * Keep thread-unread popup visible when hovering trigger badge.
   * @description Delegates hover enter to shared sidebar state so popup timing stays synchronized across trigger and popup elements.
   * @param {string} id - Sidebar item ID
   * @returns {void}
   */
  onThreadUnreadMouseEnter = (id: string): void =>
    this.workspaceSidebarService.onThreadUnreadMouseEnter(id);

  /**
   * Handle mouse leave from thread-unread trigger.
   * @description Delegates leave handling to shared hover state so delayed popup hide behavior stays consistent.
   * @returns {void}
   */
  onThreadUnreadMouseLeave = (): void => this.workspaceSidebarService.onThreadUnreadMouseLeave();

  /**
   * Keep thread-unread popup open while pointer is inside popup.
   * @description Routes popup hover events through shared state owner to prevent flicker during trigger-to-popup transitions.
   * @returns {void}
   */
  onPopupMouseEnter = (): void => this.workspaceSidebarService.onPopupMouseEnter();

  /**
   * Handle image load error - use fallback avatar
   * @description Applies a deterministic avatar fallback so broken image URLs never degrade sidebar identity cues.
   * @param {Event} event - Error event
   * @returns {void}
   */
  onImageError = (event: Event): void => {
    const img = event.target as HTMLImageElement;
    img.src = '/img/profile/profile-0.svg';
  };

  /**
   * Format sidebar badge count with upper cap.
   * @description
   * Delegation keeps formatting policy centralized for all sidebar badge surfaces.
   */
  protected formatBadgeCount = (count: number): string => formatBadgeCount(count);

  /**
   * Build ARIA label for channel item including unread counts.
   * @description
   * Central helper usage guarantees visual badge state and screen-reader copy stay consistent.
   */
  protected getChannelAriaLabel = (
    channelName: string,
    unreadMessageCount: number,
    unreadThreadCount: number,
  ): string => buildChannelAriaLabel(channelName, unreadMessageCount, unreadThreadCount);

  /**
   * Build ARIA label for direct message item including unread counts.
   * @description
   * Keeping this in the component makes accessibility output follow the same visibility rules
   * as active-item badge suppression.
   */
  protected getDirectMessageAriaLabel = (
    directMessageName: string,
    unreadMessageCount: number,
    unreadThreadCount: number,
  ): string =>
    buildDirectMessageAriaLabel(directMessageName, unreadMessageCount, unreadThreadCount);

  /**
   * Build ARIA label for mailbox item including unread count.
   * @description
   * Mailbox ARIA output is derived from the same unread source as its badge to avoid drift.
   */
  protected getMailboxAriaLabel = (): string => buildMailboxAriaLabel(this.mailboxUnreadCount());

  /**
   * Hide normal unread badge for currently active channel.
   * @description
   * Opening a channel implies the latest normal messages are being seen, so this suppresses
   * redundant signal noise in the active row.
   */
  protected getVisibleChannelUnreadMessageCount = (
    channelId: string,
    unreadMessageCount: number,
  ): number => {
    return this.selectedChannelId() === channelId ? 0 : unreadMessageCount;
  };

  /**
   * Keep thread unread badge visible for channels even when the channel row is active.
   * Opening a channel does not imply that unread threads inside it were opened.
   * @description
   * Thread and conversation unread are intentionally separated to avoid hiding actionable
   * thread follow-ups.
   */
  protected getVisibleChannelUnreadThreadCount = (
    channelId: string,
    unreadThreadCount: number,
  ): number => {
    return unreadThreadCount;
  };

  /**
   * Normalize direct message IDs so temporary self-DM IDs map to the canonical conversation ID.
   * @description Normalizes temporary and canonical DM IDs before comparisons so unread suppression logic remains correct for self-DM transitions.
   */
  private normalizeDirectMessageIdLocal(directMessageId: string): string {
    const currentUserId = this.authStore.user()?.uid;
    if (!currentUserId) return directMessageId;
    return normalizeDirectMessageId(directMessageId, currentUserId);
  }

  /**
   * Project a raw DM list item into the exact state the sidebar should render.
   * @param {DirectMessageListItem} directMessage - Raw DM list item from the service layer
   * @param {string | null} activeDirectMessageId - Effective active DM ID used for immediate UI feedback
   * @returns {VisibleDirectMessageListItem} Sidebar-ready DM item with active-aware badge counts
   * @description
   * This projection lives in the component, not the list service, because "hide unread badges for
   * the item the user just opened" is a presentation rule. The underlying unread counters still
   * need to stay truthful for other consumers, while the sidebar wants immediate visual feedback
   * even before async DM resolution and router updates finish.
   */
  private buildVisibleDirectMessageItem(
    directMessage: DirectMessageListItem,
    activeDirectMessageId: string | null,
  ): VisibleDirectMessageListItem {
    const isActive = this.normalizeDirectMessageIdLocal(directMessage.id) === activeDirectMessageId;
    const visibleUnreadMessageCount = getVisibleUnreadMessageCount(
      directMessage.unreadMessageCount,
      isActive,
    );
    const visibleUnreadThreadCount = getVisibleUnreadThreadCount(
      directMessage.unreadThreadCount,
      isActive,
    );

    return {
      ...directMessage,
      isActive,
      visibleUnreadMessageCount,
      visibleUnreadThreadCount,
    };
  }
}
