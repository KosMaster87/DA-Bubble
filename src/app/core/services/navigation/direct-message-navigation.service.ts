/**
 * @fileoverview Direct Message Navigation Service
 * @description Provides DM-specific routing helpers that preserve thread context and keep navigation signals in sync.
 * @module core/services/navigation
 */

import { Injectable, inject } from '@angular/core';
import { Router } from '@angular/router';
import { UnreadService } from '@core/services/unread/unread.service';
import { ThreadManagementService } from '@shared/services/thread-management.service';
import { NavigationStateService } from './navigation-state.service';

/**
 * Service for direct message navigation
 */
@Injectable({
  providedIn: 'root',
})
export class DirectMessageNavigationService {
  private router = inject(Router);
  private unreadService = inject(UnreadService);
  private threadManagement = inject(ThreadManagementService);
  private navigationState = inject(NavigationStateService);

  /**
   * Select direct message conversation
   * @description Marks the DM as read and preserves any open thread in the URL to prevent the thread panel from closing on DM re-navigation.
   */
  selectDirectMessage(conversationId: string): void {
    this.navigationState.setSelectedDirectMessageId(conversationId);
    this.navigationState.clearChannelSelection();
    this.unreadService.markAsRead(conversationId, true);

    // Check if a thread is open for THIS DM
    const threadInfo = this.threadManagement.threadInfo();
    const isThreadInSameDM =
      threadInfo && threadInfo.channelId === conversationId && threadInfo.isDirectMessage;

    if (isThreadInSameDM) {
      // Preserve thread in URL when navigating within same DM
      this.router.navigate([
        '/dashboard',
        'dm',
        conversationId,
        'thread',
        threadInfo.parentMessageId,
      ]);
    } else {
      // Normal navigation without thread
      this.router.navigate(['/dashboard', 'dm', conversationId]);
    }
  }

  /**
   * Select direct message by ID (programmatic, no routing)
   * Used to sync state with URL changes to avoid navigation loops
   * @description State-only update used by route watchers that have already navigated and just need to sync signals.
   */
  selectDirectMessageById(conversationId: string): void {
    this.navigationState.setSelectedChannelId(null);
    this.navigationState.setSelectedDirectMessageId(conversationId);
  }

  /**
   * Deselect current direct message
   * @description Clears only the DM selection without touching other navigation state.
   */
  deselectDirectMessage(): void {
    this.navigationState.setSelectedDirectMessageId(null);
  }

  /**
   * Navigate to direct message (explicit routing)
   * Wrapper around selectDirectMessage() for backwards compatibility
   * @description Preserved for backwards compatibility; prefer selectDirectMessage() for new call sites.
   */
  navigateToDirectMessage(conversationId: string): void {
    this.selectDirectMessage(conversationId);
    this.router.navigate(['/dashboard', 'dm', conversationId]);
  }
}
