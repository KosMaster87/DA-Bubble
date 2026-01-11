/**
 * @fileoverview Thread Navigation Service
 * @description Handles thread navigation and click handling
 * @module core/services/navigation
 */

import { Injectable, inject } from '@angular/core';
import { Router } from '@angular/router';
import { UnreadService } from '@core/services/unread/unread.service';
import { UserTransformationService } from '@core/services/user-transformation/user-transformation.service';
import { WorkspaceSidebarService } from '@shared/services/workspace-sidebar.service';
import { NavigationStateService } from './navigation-state.service';
import { type Message as ViewMessage } from '@shared/dashboard-components/conversation-messages/conversation-messages.component';

/**
 * Service for thread navigation
 */
@Injectable({
  providedIn: 'root',
})
export class ThreadNavigationService {
  private router = inject(Router);
  private unreadService = inject(UnreadService);
  private userTransformation = inject(UserTransformationService);
  private workspaceSidebar = inject(WorkspaceSidebarService);
  private navigationState = inject(NavigationStateService);

  /**
   * Navigate to conversation and prepare for thread opening
   *
   * CRITICAL: When opening threads via thread-unread popup, ALWAYS pass threadId parameter
   * to prevent race condition where thread gets closed by route handler
   *
   * @param conversationId Channel ID or DM conversation ID
   * @param isDirectMessage true for DM, false for channel
   * @param threadId Optional message ID to include in URL as /thread/:threadId
   * @returns Promise that resolves after navigation delay
   */
  async navigateToThread(
    conversationId: string,
    isDirectMessage: boolean,
    threadId?: string
  ): Promise<void> {
    if (isDirectMessage) {
      this.navigationState.setSelectedDirectMessageId(conversationId);
      this.navigationState.setSelectedChannelId(null);
    } else {
      this.navigationState.setSelectedChannelId(conversationId);
      this.navigationState.setSelectedDirectMessageId(null);
    }
    this.navigationState.setNewMessageActive(false);
    this.navigationState.setMailboxActive(false);
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

    return new Promise((resolve) => setTimeout(resolve, 100));
  }

  /**
   * Handle thread click from popup hover
   * Processes thread navigation and message transformation
   *
   * @param event Object containing conversationId, messageId, and message
   * @param isDirectMessage true if thread is in DM, false if in channel
   * @returns Object with conversationId and transformed viewMessage
   */
  handleThreadClick(
    event: { conversationId: string; messageId: string; message: any },
    isDirectMessage: boolean
  ): { conversationId: string; viewMessage: ViewMessage } {
    const { conversationId, messageId, message } = event;

    // Clear hover state
    this.workspaceSidebar.setHoveredThreadUnreadId(null);

    // Navigate to thread WITH messageId in URL to prevent race condition
    this.navigateToThread(conversationId, isDirectMessage, messageId);

    // Transform message for thread view
    const viewMessage = this.userTransformation.popupMessageToViewMessage(message);

    return { conversationId, viewMessage };
  }
}
