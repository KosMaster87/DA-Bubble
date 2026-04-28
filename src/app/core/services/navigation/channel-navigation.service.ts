/**
 * @fileoverview Channel Navigation Service
 * @description Encapsulates channel-specific routing transitions and unread side effects behind a single navigation API.
 * @module core/services/navigation
 */

import { Injectable, inject } from '@angular/core';
import { Router } from '@angular/router';
import { UnreadService } from '@core/services/unread/unread.service';
import { ThreadManagementService } from '@shared/services/thread-management.service';
import { ChannelStore } from '@stores/channels/channel.store';
import { NavigationStateService } from './navigation-state.service';

/**
 * Service for channel navigation
 */
@Injectable({
  providedIn: 'root',
})
export class ChannelNavigationService {
  private router = inject(Router);
  private channelStore = inject(ChannelStore);
  private unreadService = inject(UnreadService);
  private threadManagement = inject(ThreadManagementService);
  private navigationState = inject(NavigationStateService);

  /**
   * Select channel and handle navigation
   * Handles both real channels and virtual views (mailbox, legal)
   * @description Entry point for channel-select actions; routes virtual view IDs (mailbox, legal) to their own handler to avoid Firestore lookups for non-existent channel documents.
   */
  selectChannel(channelId: string): void {
    const virtualViews = ['mailbox', 'legal'];

    if (virtualViews.includes(channelId)) {
      this.selectVirtualView(channelId);
      return;
    }

    this.selectRealChannel(channelId);
  }

  /**
   * Select virtual view (mailbox, legal)
   * @description Sets the channel ID to the view name so sidebar active-state indicators work without a separate view-type flag.
   */
  private selectVirtualView(viewId: string): void {
    this.navigationState.setSelectedChannelId(viewId);
    this.navigationState.setSelectedDirectMessageId(null);
    this.router.navigate(['/dashboard', viewId]);
  }

  /**
   * Select real channel from Firestore
   * @description Marks the channel as read, updates state, and preserves any open thread in the URL to prevent the thread panel from closing on channel re-navigation.
   */
  private selectRealChannel(channelId: string): void {
    const channel = this.channelStore.channels().find((ch) => ch.id === channelId);
    if (!channel) return;

    this.channelStore.selectChannel(channel);
    this.navigationState.setSelectedChannelId(channelId);
    this.navigationState.clearDMSelection();
    this.unreadService.markAsRead(channelId);

    // Check if a thread is open for THIS channel
    const threadInfo = this.threadManagement.threadInfo();
    const isThreadInSameChannel =
      threadInfo && threadInfo.channelId === channelId && !threadInfo.isDirectMessage;

    if (isThreadInSameChannel) {
      // Preserve thread in URL when navigating within same channel
      this.router.navigate([
        '/dashboard',
        'channel',
        channelId,
        'thread',
        threadInfo.parentMessageId,
      ]);
    } else {
      // Normal navigation without thread
      this.router.navigate(['/dashboard', 'channel', channelId]);
    }
  }

  /**
   * Select channel by ID (programmatic, no routing)
   * Used to sync state with URL changes to avoid navigation loops
   * @description State-only update used by route watchers that have already navigated and just need to sync signals.
   */
  selectChannelById(channelId: string): void {
    this.navigationState.setSelectedChannelId(channelId);
    this.navigationState.setSelectedDirectMessageId(null);
  }

  /**
   * Navigate to channel (explicit routing)
   * Wrapper around selectChannel() for backwards compatibility
   * @description Preserved for backwards compatibility; prefer selectChannel() for new call sites.
   */
  navigateToChannel(channelId: string): void {
    this.selectChannel(channelId);
    this.router.navigate(['/dashboard', 'channel', channelId]);
  }

  /**
   * Auto-select DABubble-welcome channel if nothing selected
   * @description Safety net for cases where the app loads without any URL selection; ensures the user always sees content rather than a blank workspace.
   */
  autoSelectWelcomeChannel(): void {
    const state = this.navigationState.getState();
    const hasSelection =
      state.selectedChannelId || state.selectedDirectMessageId || state.isNewMessageActive;

    if (hasSelection) return;

    const channels = this.channelStore.channels();
    const welcomeChannel = channels.find((ch) => ch.name === 'DABubble-welcome');

    if (welcomeChannel) {
      this.selectChannel(welcomeChannel.id);
    }
  }
}
