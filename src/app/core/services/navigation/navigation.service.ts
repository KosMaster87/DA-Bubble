/**
 * @fileoverview Navigation Service
 * @description Handles workspace navigation state and auto-selection logic
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
import { type Message as ViewMessage } from '@shared/dashboard-components/conversation-messages/conversation-messages.component';

/**
 * Parsed route parameters from URL
 */
export interface RouteParams {
  path: string | undefined;
  id: string | undefined;
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

  private selectedChannelId = signal<string | null>(null);
  private selectedDirectMessageId = signal<string | null>(null);
  private isNewMessageActive = signal<boolean>(false);
  private isMailboxActive = signal<boolean>(false);

  /**
   * Reactive route signal - parses URL to extract route type and ID
   * Examples: /dashboard → {path: undefined, id: undefined}
   *          /dashboard/channel/123 → {path: 'channel', id: '123'}
   *          /dashboard/dm/456 → {path: 'dm', id: '456'}
   */
  private routeParams = toSignal(
    this.router.events.pipe(
      filter((event): event is NavigationEnd => event instanceof NavigationEnd),
      map(() => this.parseUrl(this.router.url))
    ),
    { initialValue: { path: undefined, id: undefined } }
  );

  /**
   * Get current navigation state
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
   * Handles both real channels and virtual views (mailbox, legal)
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
      this.router.navigate(['/dashboard', 'channel', channelId]);
    }
  }

  /**
   * Select channel by ID (programmatic, no emit)
   * Used for routing effects to avoid circular navigation
   */
  selectChannelById(channelId: string): void {
    this.selectedChannelId.set(channelId);
    this.selectedDirectMessageId.set(null);
  }

  /**
   * Select direct message
   */
  selectDirectMessage(conversationId: string): void {
    this.selectedDirectMessageId.set(conversationId);
    this.selectedChannelId.set(null);
    this.isNewMessageActive.set(false);
    this.isMailboxActive.set(false);
    this.unreadService.markAsRead(conversationId);
  }

  /**
   * Select direct message by ID (programmatic, no emit)
   * Used for routing effects to avoid circular navigation
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
   * @param conversationId The conversation ID (channel or DM)
   * @param isDirectMessage Whether it's a DM conversation
   * @returns Promise that resolves after navigation delay
   */
  async navigateToThread(conversationId: string, isDirectMessage: boolean): Promise<void> {
    // Navigate to the channel or DM
    if (isDirectMessage) {
      this.selectDirectMessage(conversationId);
    } else {
      this.selectChannel(conversationId);
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
   */
  navigateToChannel(channelId: string): void {
    this.selectChannel(channelId);
    this.router.navigate(['/dashboard', 'channel', channelId]);
  }

  /**
   * Navigate to direct message
   */
  navigateToDirectMessage(conversationId: string): void {
    this.selectDirectMessage(conversationId);
    this.router.navigate(['/dashboard', 'dm', conversationId]);
  }

  /**
   * Navigate to mailbox
   */
  navigateToMailbox(): void {
    this.selectMailbox();
    this.router.navigate(['/dashboard', 'mailbox']);
  }

  /**
   * Handle thread click from popup hover
   * Processes thread navigation and message transformation
   * @param event Event data from thread hover popup
   * @param isDirectMessage Whether this is a DM thread
   * @returns Object containing conversationId and transformed message
   */
  handleThreadClick(
    event: { conversationId: string; messageId: string; message: any },
    isDirectMessage: boolean
  ): { conversationId: string; viewMessage: ViewMessage } {
    const { conversationId, messageId, message } = event;

    // Clear hover state
    this.workspaceSidebarService.setHoveredThreadUnreadId(null);

    // Navigate to thread (navigateToThread only takes conversationId and isDirectMessage)
    this.navigateToThread(conversationId, isDirectMessage);

    // Transform message for thread view
    const viewMessage = this.userTransformationService.popupMessageToViewMessage(message);

    return { conversationId, viewMessage };
  }

  /**
   * Parse URL to extract route type and ID
   * @param url Current router URL
   * @returns Parsed route parameters
   */
  private parseUrl(url: string): RouteParams {
    // Parse URL: /dashboard, /dashboard/mailbox, /dashboard/channel/123, /dashboard/dm/456
    const parts = url.split('/').filter((p) => p); // Remove empty strings

    if (parts.length === 1 && parts[0] === 'dashboard') {
      return { path: undefined, id: undefined }; // Just /dashboard → welcome
    }

    if (parts.length >= 2 && parts[0] === 'dashboard') {
      const type = parts[1]; // 'mailbox', 'channel', or 'dm'
      const id = parts[2]; // channel/dm ID (if exists)
      return { path: type, id };
    }

    return { path: undefined, id: undefined };
  }

  /**
   * Get current route parameters as signal
   * @returns Signal with parsed route parameters
   */
  getRouteParams(): Signal<RouteParams> {
    return this.routeParams;
  }
}
