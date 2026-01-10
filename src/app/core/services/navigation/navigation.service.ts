/**
 * @fileoverview Navigation Service - Central Navigation Orchestrator
 * @description
 * This service is the single source of truth for workspace navigation state and routing.
 * It coordinates navigation between channels, direct messages, threads, and special views.
 *
 * === DATA FLOW OVERVIEW ===
 *
 * 1. USER INTERACTIONS → Navigation Service:
 *    - Sidebar channel clicks → selectChannel()
 *    - DM list clicks → selectDirectMessage()
 *    - Thread-unread popup clicks → handleThreadClick()
 *    - New message button → selectNewMessage()
 *    - Mailbox button → selectMailbox()
 *
 * 2. EXTERNAL SERVICES → Navigation Service:
 *    - invitation-management.service.ts → navigateToChannel() (after accepting invitation)
 *    - dashboard.component.ts → openThread() / closeThread() (thread state management)
 *    - Route guards → getState() / getRouteParams() (validate navigation)
 *
 * 3. Navigation Service → OTHER SERVICES:
 *    - Router → navigate() (updates browser URL)
 *    - ChannelStore → selectChannel() (loads channel data)
 *    - UnreadService → markAsRead() (clears unread badges)
 *    - WorkspaceSidebarService → setHoveredThreadUnreadId() (UI state)
 *
 * === URL STRUCTURE ===
 *
 * /dashboard                          → Welcome view (auto-selects DABubble-welcome)
 * /dashboard/channel/:id              → Channel conversation
 * /dashboard/channel/:id/thread/:tid  → Channel conversation with thread open
 * /dashboard/dm/:id                   → Direct message conversation
 * /dashboard/dm/:id/thread/:tid       → DM conversation with thread open
 * /dashboard/mailbox                  → Mailbox (threads overview)
 * /dashboard/legal                    → Legal/imprint page
 *
 * === CRITICAL NAVIGATION RULES ===
 *
 * 1. **Use Array Segments**: ALWAYS use router.navigate(['/dashboard', 'channel', id])
 *    NEVER use string concatenation: router.navigate(['/dashboard/channel/' + id]) ❌
 *    String concatenation causes URL encoding issues and 404 errors!
 *
 * 2. **Thread URL = Thread State**: The URL is the single source of truth for thread state.
 *    - Thread open → URL includes /thread/:messageId
 *    - Thread closed → URL does NOT include /thread/
 *    - dashboard.component.ts manages this via openThread() / closeThread()
 *
 * 3. **Avoid Navigation Loops**: Use *ById() methods (selectChannelById, selectDirectMessageById)
 *    when responding to route changes to prevent circular navigation triggers.
 *
 * 4. **Thread Navigation Race Conditions**: Always pass threadId to navigateToThread()
 *    when opening threads via thread-unread popup to prevent thread from being closed
 *    by route change handler.
 *
 * @module core/services/navigation
 */

import { inject, Injectable, signal, Signal } from '@angular/core';
import { Router, NavigationEnd } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { filter, map } from 'rxjs/operators';
import { ChannelStore } from '@stores/channel.store';
import { UnreadService } from '@core/services/unread/unread.service';
import { UserTransformationService } from '@core/services/user-transformation/user-transformation.service';
import { WorkspaceSidebarService } from '@shared/services/workspace-sidebar.service';
import { ThreadManagementService } from '@shared/services/thread-management.service';
import { type Message as ViewMessage } from '@shared/dashboard-components/conversation-messages/conversation-messages.component';

/**
 * Parsed route parameters from URL
 */
export interface RouteParams {
  path: string | undefined;
  id: string | undefined;
  threadId: string | undefined;
}

/**
 * Navigation state for workspace
 */
export interface NavigationState {
  selectedChannelId: string | null;
  selectedDirectMessageId: string | null;
  isNewMessageActive: boolean;
  isMailboxActive: boolean;
}

/**
 * Service for managing workspace navigation
 */
@Injectable({
  providedIn: 'root',
})
export class NavigationService {
  private router = inject(Router);
  private channelStore = inject(ChannelStore);
  private unreadService = inject(UnreadService);
  private userTransformationService = inject(UserTransformationService);
  private workspaceSidebarService = inject(WorkspaceSidebarService);
  private threadManagementService = inject(ThreadManagementService);

  private selectedChannelId = signal<string | null>(null);
  private selectedDirectMessageId = signal<string | null>(null);
  private isNewMessageActive = signal<boolean>(false);
  private isMailboxActive = signal<boolean>(false);

  /**
   * Reactive route signal - parses URL to extract route type and ID
   *
   * === DATA SOURCE ===
   * Automatically updated on every Angular Router NavigationEnd event
   *
   * === WHAT IT PROVIDES ===
   * Real-time URL parsing that updates on every route change:
   * - /dashboard → {path: undefined, id: undefined}
   * - /dashboard/channel/123 → {path: 'channel', id: '123'}
   * - /dashboard/dm/456 → {path: 'dm', id: '456'}
   *
   * === WHO USES IT ===
   * - dashboard.component.ts: handleRouteChange() subscribes to detect route changes
   * - Route guards: Can check current route type and ID
   *
   * === OUTPUT ===
   * Signal<RouteParams> that updates automatically on navigation
   */
  private routeParams = toSignal(
    this.router.events.pipe(
      filter((event): event is NavigationEnd => event instanceof NavigationEnd),
      map(() => this.parseUrl(this.router.url))
    ),
    { initialValue: { path: undefined, id: undefined, threadId: undefined } }
  );

  /**
   * Get current navigation state
   *
   * === DATA SOURCE ===
   * Aggregates all internal state signals into single snapshot
   *
   * === WHAT IT EXPECTS ===
   * No parameters
   *
   * === WHAT IT PROVIDES ===
   * Snapshot of current navigation state:
   * - selectedChannelId: Currently selected channel (or null)
   * - selectedDirectMessageId: Currently selected DM (or null)
   * - isNewMessageActive: Whether new message view is open
   * - isMailboxActive: Whether mailbox view is open
   *
   * === WHO USES IT ===
   * - Components that need to check navigation state
   * - Route guards for validation
   * - Services that coordinate with navigation
   *
   * === OUTPUT ===
   * NavigationState object (plain object, NOT reactive)
   */
  getState(): NavigationState {
    return {
      selectedChannelId: this.selectedChannelId(),
      selectedDirectMessageId: this.selectedDirectMessageId(),
      isNewMessageActive: this.isNewMessageActive(),
      isMailboxActive: this.isMailboxActive(),
    };
  }

  /**
   * Get selected channel ID signal (read-only)
   */
  getSelectedChannelId() {
    return this.selectedChannelId.asReadonly();
  }

  /**
   * Get selected DM ID signal (read-only)
   */
  getSelectedDirectMessageId() {
    return this.selectedDirectMessageId.asReadonly();
  }

  /**
   * Select channel and handle navigation
   *
   * === DATA SOURCE ===
   * Called from:
   * - workspace-sidebar.component.ts: User clicks channel in sidebar
   * - invitation-management.service.ts: After accepting channel invitation (via navigateToChannel wrapper)
   * - Auto-selection: autoSelectWelcomeChannel() selects default channel on load
   *
   * === WHAT IT EXPECTS ===
   * @param channelId - Can be either:
   *   1. Real Firestore channel ID (e.g., "nbYIOKdPsFUmsrknSZl7")
   *   2. Virtual view ID: "mailbox" or "legal"
   *
   * === WHAT IT DOES ===
   * 1. If virtual view → Sets state and navigates to /dashboard/:view
   * 2. If real channel → Loads channel from ChannelStore, updates state, marks as read, navigates to /dashboard/channel/:id
   * 3. Clears DM/new-message/mailbox state
   * 4. Triggers Angular Router navigation (updates browser URL)
   *
   * === OUTPUT ===
   * - Updates selectedChannelId signal → Sidebar highlights selected channel
   * - Router navigates → Browser URL changes → dashboard.component.ts responds via handleRouteChange()
   * - UnreadService marks channel as read → Unread badge disappears
   */
  selectChannel(channelId: string): void {
    // Special virtual views (not real channels)
    const virtualViews = ['mailbox', 'legal'];
    if (virtualViews.includes(channelId)) {
      this.selectedChannelId.set(channelId);
      this.selectedDirectMessageId.set(null);
      this.router.navigate(['/dashboard', channelId]);
      return;
    }

    // Real channels from Firestore
    const channel = this.channelStore.channels().find((ch) => ch.id === channelId);
    if (channel) {
      this.channelStore.selectChannel(channel);
      this.selectedChannelId.set(channelId);
      this.selectedDirectMessageId.set(null);
      this.isNewMessageActive.set(false);
      this.isMailboxActive.set(false);
      this.unreadService.markAsRead(channelId);

      // Check if a thread is open for THIS channel
      const threadInfo = this.threadManagementService.threadInfo();
      const isThreadInSameChannel = threadInfo &&
        threadInfo.channelId === channelId &&
        !threadInfo.isDirectMessage;

      if (isThreadInSameChannel) {
        // Preserve thread in URL when navigating within same channel
        this.router.navigate(['/dashboard', 'channel', channelId, 'thread', threadInfo.parentMessageId]);
      } else {
        // Normal navigation without thread
        this.router.navigate(['/dashboard', 'channel', channelId]);
      }
    }
  }

  /**
   * Select channel by ID (programmatic, no emit)
   *
   * === DATA SOURCE ===
   * Called from:
   * - dashboard.component.ts: handleRouteChange() when route changes to /dashboard/channel/:id
   * - Route guards: When validating navigation
   *
   * === WHAT IT EXPECTS ===
   * @param channelId - Real Firestore channel ID (NOT virtual views)
   *
   * === WHAT IT DOES ===
   * Updates internal state WITHOUT triggering navigation.
   * Used to sync state with URL changes to avoid navigation loops.
   *
   * === WHY IT EXISTS ===
   * Prevents circular navigation:
   * - User navigates via URL → Route changes → handleRouteChange() calls selectChannelById()
   * - If we called selectChannel() instead → Would trigger router.navigate() again → Loop!
   *
   * === OUTPUT ===
   * - Updates selectedChannelId signal (state only, no side effects)
   * - Clears selectedDirectMessageId signal
   */
  selectChannelById(channelId: string): void {
    this.selectedChannelId.set(channelId);
    this.selectedDirectMessageId.set(null);
  }

  /**
   * Select direct message
   *
   * === DATA SOURCE ===
   * Called from:
   * - workspace-sidebar.component.ts: User clicks DM in sidebar
   * - new-message.component.ts: User starts new DM conversation
   *
   * === WHAT IT EXPECTS ===
   * @param conversationId - Firestore direct message conversation ID
   *
   * === WHAT IT DOES ===
   * 1. Sets selectedDirectMessageId signal
   * 2. Clears channel/new-message/mailbox state
   * 3. Marks conversation as read (clears unread badge)
   * 4. Navigates to /dashboard/dm/:conversationId
   *
   * === OUTPUT ===
   * - Updates selectedDirectMessageId signal → Sidebar highlights selected DM
   * - Router navigates → Browser URL changes → dashboard.component.ts responds
   * - UnreadService marks DM as read → Unread badge disappears
   */
  selectDirectMessage(conversationId: string): void {
    this.selectedDirectMessageId.set(conversationId);
    this.selectedChannelId.set(null);
    this.isNewMessageActive.set(false);
    this.isMailboxActive.set(false);
    this.unreadService.markAsRead(conversationId);

    // Check if a thread is open for THIS DM
    const threadInfo = this.threadManagementService.threadInfo();
    const isThreadInSameDM = threadInfo &&
      threadInfo.channelId === conversationId &&
      threadInfo.isDirectMessage;

    if (isThreadInSameDM) {
      // Preserve thread in URL when navigating within same DM
      this.router.navigate(['/dashboard', 'dm', conversationId, 'thread', threadInfo.parentMessageId]);
    } else {
      // Normal navigation without thread
      this.router.navigate(['/dashboard', 'dm', conversationId]);
    }
  }

  /**
   * Select direct message by ID (programmatic, no emit)
   *
   * === DATA SOURCE ===
   * Called from:
   * - dashboard.component.ts: handleRouteChange() when route changes to /dashboard/dm/:id
   *
   * === WHAT IT EXPECTS ===
   * @param conversationId - Firestore direct message conversation ID
   *
   * === WHAT IT DOES ===
   * Updates internal state WITHOUT triggering navigation.
   * Prevents circular navigation loops (same as selectChannelById).
   *
   * === OUTPUT ===
   * - Updates selectedDirectMessageId signal
   * - Clears selectedChannelId signal
   */
  selectDirectMessageById(conversationId: string): void {
    this.selectedChannelId.set(null);
    this.selectedDirectMessageId.set(conversationId);
  }

  /**
   * Deselect current direct message
   */
  deselectDirectMessage(): void {
    this.selectedDirectMessageId.set(null);
  }

  /**
   * Navigate to legal page
   */
  navigateToLegal(): void {
    this.selectedChannelId.set('legal');
    this.router.navigate(['/dashboard/legal']);
  }

  /**
   * Select new message view
   */
  selectNewMessage(): void {
    this.isNewMessageActive.set(true);
    this.selectedChannelId.set(null);
    this.selectedDirectMessageId.set(null);
    this.isMailboxActive.set(false);
  }

  /**
   * Select mailbox
   */
  selectMailbox(): void {
    this.isMailboxActive.set(true);
    this.selectedChannelId.set(null);
    this.selectedDirectMessageId.set(null);
    this.isNewMessageActive.set(false);
  }

  /**
   * Navigate to conversation and prepare for thread opening
   *
   * === DATA SOURCE ===
   * Called from:
   * - handleThreadClick(): User clicks thread in thread-unread popup (passes messageId as threadId)
   * - dashboard.component.ts: openThread() may call this for navigation (usually navigates directly)
   *
   * === WHAT IT EXPECTS ===
   * @param conversationId - Channel ID or DM conversation ID
   * @param isDirectMessage - true for DM, false for channel
   * @param threadId - OPTIONAL: Message ID to include in URL as /thread/:threadId
   *                   CRITICAL: Including threadId prevents race condition where thread gets closed
   *                   by handleRouteChange() before it can be opened
   *
   * === WHAT IT DOES ===
   * 1. Updates internal state (selectedChannelId or selectedDirectMessageId)
   * 2. Marks conversation as read
   * 3. Navigates to:
   *    - WITH threadId: /dashboard/:type/:id/thread/:threadId (prevents thread from being closed)
   *    - WITHOUT threadId: /dashboard/:type/:id (normal conversation navigation)
   * 4. Returns promise with 100ms delay to ensure conversation loads before thread opens
   *
   * === CRITICAL: Thread Navigation Race Condition ===
   * When opening threads via thread-unread popup, ALWAYS pass threadId parameter:
   * - If threadId included → URL has /thread/:threadId → handleRouteChange() skips thread closing
   * - If threadId omitted → URL has no /thread/ → handleRouteChange() closes thread immediately!
   *
   * === OUTPUT ===
   * - Router navigates to conversation (with or without /thread/ in URL)
   * - Returns promise that resolves after 100ms delay
   * - Caller can await this before calling openThread()
   *
   * @returns Promise that resolves after navigation delay
   */
  async navigateToThread(conversationId: string, isDirectMessage: boolean, threadId?: string): Promise<void> {
    // Update internal state
    if (isDirectMessage) {
      this.selectedDirectMessageId.set(conversationId);
      this.selectedChannelId.set(null);
    } else {
      this.selectedChannelId.set(conversationId);
      this.selectedDirectMessageId.set(null);
    }
    this.isNewMessageActive.set(false);
    this.isMailboxActive.set(false);

    // Mark as read
    this.unreadService.markAsRead(conversationId);

    // Navigate with or without thread ID in URL
    if (threadId) {
      // Navigate to conversation WITH thread in URL to prevent thread from being closed
      const path = isDirectMessage ? 'dm' : 'channel';
      this.router.navigate(['/dashboard', path, conversationId, 'thread', threadId]);
    } else {
      // Navigate to conversation only
      if (isDirectMessage) {
        this.router.navigate(['/dashboard', 'dm', conversationId]);
      } else {
        this.router.navigate(['/dashboard', 'channel', conversationId]);
      }
    }

    // Small delay to ensure conversation is loaded before opening thread
    return new Promise((resolve) => setTimeout(resolve, 100));
  }

  /**
   * Auto-select DABubble-welcome channel if nothing selected
   */
  autoSelectWelcomeChannel(): void {
    const hasSelection =
      this.selectedChannelId() || this.selectedDirectMessageId() || this.isNewMessageActive();

    if (hasSelection) return;

    const channels = this.channelStore.channels();
    const welcomeChannel = channels.find((ch) => ch.name === 'DABubble-welcome');

    if (welcomeChannel) {
      this.selectChannel(welcomeChannel.id);
    }
  }

  /**
   * Clear all selections
   */
  clearSelection(): void {
    this.selectedChannelId.set(null);
    this.selectedDirectMessageId.set(null);
    this.isNewMessageActive.set(false);
    this.isMailboxActive.set(false);
  }

  /**
   * Navigate to channel
   *
   * === DATA SOURCE ===
   * Called from:
   * - invitation-management.service.ts: After accepting channel invitation
   *
   * === WHAT IT EXPECTS ===
   * @param channelId - Real Firestore channel ID
   *
   * === WHAT IT DOES ===
   * Wrapper around selectChannel() that ensures navigation happens.
   * Explicitly calls router.navigate() even though selectChannel() already does it.
   * (Redundant navigation call, but kept for backwards compatibility)
   *
   * === CRITICAL: Route Segment Array ===
   * Uses CORRECT syntax: ['/dashboard', 'channel', channelId]
   * NEVER use: ['/dashboard/channel/' + channelId] → causes 404!
   *
   * === OUTPUT ===
   * - Same as selectChannel(): Updates state, marks as read, navigates
   */
  navigateToChannel(channelId: string): void {
    this.selectChannel(channelId);
    this.router.navigate(['/dashboard', 'channel', channelId]);
  }

  /**
   * Navigate to direct message
   *
   * === DATA SOURCE ===
   * Called from:
   * - invitation-management.service.ts: After accepting DM invitation (if implemented)
   *
   * === WHAT IT EXPECTS ===
   * @param conversationId - Firestore DM conversation ID
   *
   * === WHAT IT DOES ===
   * Wrapper around selectDirectMessage() that ensures navigation.
   *
   * === OUTPUT ===
   * - Same as selectDirectMessage(): Updates state, marks as read, navigates
   */
  navigateToDirectMessage(conversationId: string): void {
    this.selectDirectMessage(conversationId);
    this.router.navigate(['/dashboard', 'dm', conversationId]);
  }

  /**
   * Navigate to mailbox
   *
   * === DATA SOURCE ===
   * Called from:
   * - header.component.ts or similar: User clicks mailbox button
   *
   * === WHAT IT EXPECTS ===
   * No parameters
   *
   * === WHAT IT DOES ===
   * Wrapper around selectMailbox() that ensures navigation.
   *
   * === OUTPUT ===
   * - Same as selectMailbox(): Updates state, navigates to /dashboard/mailbox
   */
  navigateToMailbox(): void {
    this.selectMailbox();
    this.router.navigate(['/dashboard', 'mailbox']);
  }

  /**
   * Handle thread click from popup hover
   * Processes thread navigation and message transformation
   *
   * === DATA SOURCE ===
   * Called from:
   * - workspace-sidebar.component.ts: User clicks thread in thread-unread popup
   *
   * === WHAT IT EXPECTS ===
   * @param event - Object containing:
   *   - conversationId: Channel/DM ID where thread lives
   *   - messageId: Original message ID that started the thread
   *   - message: Full message object from Firestore (store format)
   * @param isDirectMessage - true if thread is in DM, false if in channel
   *
   * === WHAT IT DOES ===
   * 1. Clears hover state in sidebar (removes thread popup)
   * 2. Calls navigateToThread() with messageId as threadId parameter
   *    CRITICAL: Passes messageId to prevent race condition!
   * 3. Transforms message from store format to view format (for thread display)
   * 4. Returns conversationId and transformed message for caller to use
   *
   * === DATA FLOW ===
   * 1. User hovers thread in sidebar → thread-unread popup appears
   * 2. User clicks thread → workspace-sidebar emits threadClicked event
   * 3. dashboard.component.ts calls handleThreadClick()
   * 4. This method:
   *    - Navigates to conversation WITH /thread/:messageId in URL
   *    - Transforms message for display
   *    - Returns data to dashboard.component.ts
   * 5. dashboard.component.ts calls openThread() with returned data
   * 6. Thread opens successfully (URL has /thread/ so it doesn't get closed)
   *
   * === OUTPUT ===
   * @returns Object with:
   *   - conversationId: For identifying which conversation to load
   *   - viewMessage: Transformed message ready for thread-messages component
   *
   * Side effects:
   * - Clears hover state in WorkspaceSidebarService
   * - Navigates to /dashboard/:type/:id/thread/:messageId
   * - Marks conversation as read
   */
  handleThreadClick(
    event: { conversationId: string; messageId: string; message: any },
    isDirectMessage: boolean
  ): { conversationId: string; viewMessage: ViewMessage } {
    const { conversationId, messageId, message } = event;

    // Clear hover state
    this.workspaceSidebarService.setHoveredThreadUnreadId(null);

    // Navigate to thread WITH messageId in URL to prevent race condition
    this.navigateToThread(conversationId, isDirectMessage, messageId);

    // Transform message for thread view
    const viewMessage = this.userTransformationService.popupMessageToViewMessage(message);

    return { conversationId, viewMessage };
  }

  /**
   * Parse URL to extract route type and ID
   *
   * === DATA SOURCE ===
   * Called internally by:
   * - routeParams signal: Parses URL on every NavigationEnd event
   *
   * === WHAT IT EXPECTS ===
   * @param url - Current router URL string (e.g., "/dashboard/channel/123/thread/456")
   *
   * === WHAT IT DOES ===
   * Parses URL into route segments and extracts:
   * - Route type: 'channel', 'dm', 'mailbox', 'legal', or undefined
   * - Resource ID: Channel/DM ID (if present)
   *
   * Examples:
   * - /dashboard → {path: undefined, id: undefined} (welcome view)
   * - /dashboard/mailbox → {path: 'mailbox', id: undefined}
   * - /dashboard/channel/123 → {path: 'channel', id: '123'}
   * - /dashboard/channel/123/thread/456 → {path: 'channel', id: '123'} (ignores /thread/)
   * - /dashboard/dm/789 → {path: 'dm', id: '789'}
   *
   * === OUTPUT ===
   * @returns RouteParams object with parsed route information
   *
   * NOTE: This method ignores /thread/:threadId segments.
   * Thread state is managed separately by dashboard.component.ts.
   */
  private parseUrl(url: string): RouteParams {
    // Parse URL: /dashboard, /dashboard/mailbox, /dashboard/channel/123, /dashboard/dm/456, /dashboard/channel/123/thread/789
    const parts = url.split('/').filter((p) => p); // Remove empty strings

    if (parts.length === 1 && parts[0] === 'dashboard') {
      return { path: undefined, id: undefined, threadId: undefined }; // Just /dashboard → welcome
    }

    if (parts.length >= 2 && parts[0] === 'dashboard') {
      const type = parts[1]; // 'mailbox', 'channel', or 'dm'
      const id = parts[2]; // channel/dm ID (if exists)

      // Check for thread route: /dashboard/channel/:id/thread/:threadId
      const threadId = parts[3] === 'thread' ? parts[4] : undefined;

      return { path: type, id, threadId };
    }

    return { path: undefined, id: undefined, threadId: undefined };
  }

  /**
   * Get current route parameters as signal
   *
   * === DATA SOURCE ===
   * Returns the reactive routeParams signal
   *
   * === WHAT IT PROVIDES ===
   * Live-updating signal that changes on every route navigation
   *
   * === WHO USES IT ===
   * - dashboard.component.ts: Subscribes to detect route changes
   * - Components that need to react to URL changes
   *
   * === OUTPUT ===
   * @returns Signal<RouteParams> - Reactive signal with current route info
   */
  getRouteParams(): Signal<RouteParams> {
    return this.routeParams;
  }
}
