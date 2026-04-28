/**
 * @fileoverview Navigation Service - Central Navigation Orchestrator
 * @description
 * This service is the single source of truth for workspace navigation state and routing.
 * It coordinates navigation between channels, direct messages, threads, and special views.
 *
 * Delegates to specialized navigation services:
 * - NavigationStateService: State management
 * - RouteParserService: URL parsing
 * - ChannelNavigationService: Channel navigation
 * - DirectMessageNavigationService: DM navigation
 * - ThreadNavigationService: Thread navigation
 *
 * @module core/services/navigation
 */

import { inject, Injectable, Signal } from '@angular/core';
import { Router } from '@angular/router';
import { type Message as ViewMessage } from '@shared/dashboard-components/conversation-messages/conversation-messages.component';
import { ChannelNavigationService } from './channel-navigation.service';
import { DirectMessageNavigationService } from './direct-message-navigation.service';
import { NavigationStateService, type NavigationState } from './navigation-state.service';
import { RouteParserService, type RouteParams } from './route-parser.service';
import { ThreadNavigationService } from './thread-navigation.service';

export type { NavigationState, RouteParams };

/**
 * Service for managing workspace navigation
 */
@Injectable({
  providedIn: 'root',
})
export class NavigationService {
  private router = inject(Router);
  private stateService = inject(NavigationStateService);
  private routeParser = inject(RouteParserService);
  private channelNav = inject(ChannelNavigationService);
  private dmNav = inject(DirectMessageNavigationService);
  private threadNav = inject(ThreadNavigationService);

  // === STATE GETTERS ===

  /**
   * Get current navigation state
   * @description Provides a snapshot of all active selections for components that need to read multiple state values at once.
   */
  getState(): NavigationState {
    return this.stateService.getState();
  }

  /**
   * Handle page reload - Navigate to dashboard on F5
   * @description Redirects reload events to /dashboard to avoid serving stale query-param routes after a hard refresh.
   */
  handlePageReload(): void {
    const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
    if (navigation?.type !== 'reload') return;

    const currentUrl = this.router.url;
    if (currentUrl !== '/dashboard' && !currentUrl.startsWith('/dashboard?')) {
      this.router.navigate(['/dashboard'], { replaceUrl: true });
    }
  }

  /**
   * Get selected channel ID signal (read-only)
   * @description Exposes channel selection state reactively so channel-aware components don't need to inject NavigationStateService directly.
   */
  getSelectedChannelId() {
    return this.stateService.getSelectedChannelId();
  }

  /**
   * Get selected DM ID signal (read-only)
   * @description Exposes DM selection state reactively so DM-aware components stay decoupled from the state service.
   */
  getSelectedDirectMessageId() {
    return this.stateService.getSelectedDirectMessageId();
  }

  // === CHANNEL NAVIGATION ===

  /**
   * Select channel and handle navigation
   * @description Facade delegating to ChannelNavigationService; also handles virtual views like mailbox and legal.
   */
  selectChannel(channelId: string): void {
    this.channelNav.selectChannel(channelId);
  }

  /**
   * Select channel by ID (programmatic, no routing)
   * @description Syncs state with URL-driven navigation without triggering a redundant router navigate call.
   */
  selectChannelById(channelId: string): void {
    this.channelNav.selectChannelById(channelId);
  }

  /**
   * Navigate to channel (explicit routing)
   * @description Combines state update and router navigation for callers that require both side-effects.
   */
  navigateToChannel(channelId: string): void {
    this.channelNav.navigateToChannel(channelId);
  }

  /**
   * Auto-select DABubble-welcome channel if nothing selected
   * @description Falls back to the welcome channel when the app loads without any pre-selected route.
   */
  autoSelectWelcomeChannel(): void {
    this.channelNav.autoSelectWelcomeChannel();
  }

  // === DIRECT MESSAGE NAVIGATION ===

  /**
   * Select direct message
   * @description Facade delegating to DirectMessageNavigationService and marking the DM as read on selection.
   */
  selectDirectMessage(conversationId: string): void {
    this.dmNav.selectDirectMessage(conversationId);
  }

  /**
   * Select direct message by ID (programmatic, no routing)
   * @description Syncs DM state with URL-driven navigation without triggering a redundant router navigate call.
   */
  selectDirectMessageById(conversationId: string): void {
    this.dmNav.selectDirectMessageById(conversationId);
  }

  /**
   * Deselect current direct message
   * @description Clears the active DM selection without triggering a full navigation event.
   */
  deselectDirectMessage(): void {
    this.dmNav.deselectDirectMessage();
  }

  /**
   * Navigate to direct message (explicit routing)
   * @description Combines state update and router navigation for callers that require both side-effects.
   */
  navigateToDirectMessage(conversationId: string): void {
    this.dmNav.navigateToDirectMessage(conversationId);
  }

  // === THREAD NAVIGATION ===

  /**
   * Navigate to conversation and prepare for thread opening
   *
   * CRITICAL: When opening threads via thread-unread popup, ALWAYS pass threadId parameter
   * to prevent race condition where thread gets closed by route handler
   * @description Facade over ThreadNavigationService; the threadId inclusion in the URL prevents the route change from closing an already-open thread.
   *
   * @param conversationId Channel ID or DM conversation ID
   * @param isDirectMessage true for DM, false for channel
   * @param threadId Optional message ID to include in URL as /thread/:threadId
   * @returns Promise that resolves after navigation delay
   */
  async navigateToThread(
    conversationId: string,
    isDirectMessage: boolean,
    threadId?: string,
  ): Promise<void> {
    return this.threadNav.navigateToThread(conversationId, isDirectMessage, threadId);
  }

  /**
   * Handle thread click from popup hover
   * @description Combines navigation, hover state cleanup, and message transformation so thread popup click handlers stay thin.
   */
  handleThreadClick(
    event: { conversationId: string; messageId: string; message: any },
    isDirectMessage: boolean,
  ): { conversationId: string; viewMessage: ViewMessage } {
    return this.threadNav.handleThreadClick(event, isDirectMessage);
  }

  // === SPECIAL VIEWS ===

  /**
   * Navigate to legal page
   * @description Clears active selections before navigating so the sidebar doesn't show a channel or DM as active while the legal page is open.
   */
  navigateToLegal(): void {
    this.stateService.setSelectedChannelId('legal');
    this.stateService.setSelectedDirectMessageId(null);
    this.stateService.setNewMessageActive(false);
    this.stateService.setMailboxActive(false);
    this.router.navigate(['/dashboard/legal']);
  }

  /**
   * Navigate to settings page
   * @description Clears active selections before navigating so the sidebar doesn't show a channel or DM as active while the settings page is open.
   */
  navigateToSettings(): void {
    this.stateService.setSelectedChannelId('settings');
    this.stateService.setSelectedDirectMessageId(null);
    this.stateService.setNewMessageActive(false);
    this.stateService.setMailboxActive(false);
    this.router.navigate(['/dashboard/settings']);
  }

  /**
   * Select new message view
   * @description Activates the compose-new-message view and clears all other selections so only one main content area is active at a time.
   */
  selectNewMessage(): void {
    this.stateService.setNewMessageActive(true);
    this.stateService.setSelectedChannelId(null);
    this.stateService.setSelectedDirectMessageId(null);
    this.stateService.setMailboxActive(false);
    this.router.navigate(['/dashboard/new-message']);
  }

  /**
   * Select mailbox
   * @description Activates the mailbox view and clears all other selections; separate from navigateToMailbox to allow state-only updates.
   */
  selectMailbox(): void {
    this.stateService.setMailboxActive(true);
    this.stateService.clearAll();
  }

  /**
   * Navigate to mailbox
   * @description Combines selectMailbox state update with an explicit router navigate so the URL always stays in sync.
   */
  navigateToMailbox(): void {
    this.selectMailbox();
    this.router.navigate(['/dashboard', 'mailbox']);
  }

  /**
   * Clear all selections
   * @description Resets the entire navigation state, used for logout and route guard cleanup.
   */
  clearSelection(): void {
    this.stateService.clearAll();
  }

  // === ROUTE PARSING ===

  /**
   * Get current route parameters as signal
   * @description Provides reactive access to parsed URL parameters so components can respond to route changes without subscribing to the Router event stream directly.
   */
  getRouteParams(): Signal<RouteParams> {
    return this.routeParser.getRouteParams();
  }
}
