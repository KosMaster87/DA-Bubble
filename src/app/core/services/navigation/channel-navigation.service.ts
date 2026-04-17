/**
 * @fileoverview Channel Navigation Service
 * @description Handles channel navigation and routing
 * @module core/services/navigation
 */

import { Injectable, inject } from '@angular/core';
import { Router } from '@angular/router';
import { ChannelStore } from '@stores/channels/channel.store';
import { UnreadService } from '@core/services/unread/unread.service';
import { ThreadManagementService } from '@shared/services/thread-management.service';
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
   */
  private selectVirtualView(viewId: string): void {
    this.navigationState.setSelectedChannelId(viewId);
    this.navigationState.setSelectedDirectMessageId(null);
    this.router.navigate(['/dashboard', viewId]);
  }

  /**
   * Select real channel from Firestore
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
   */
  selectChannelById(channelId: string): void {
    this.navigationState.setSelectedChannelId(channelId);
    this.navigationState.setSelectedDirectMessageId(null);
  }

  /**
   * Navigate to channel (explicit routing)
   * Wrapper around selectChannel() for backwards compatibility
   */
  navigateToChannel(channelId: string): void {
    this.selectChannel(channelId);
    this.router.navigate(['/dashboard', 'channel', channelId]);
  }

  /**
   * Auto-select DABubble-welcome channel if nothing selected
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
