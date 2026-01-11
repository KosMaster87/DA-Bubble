/**
 * @fileoverview Dashboard Thread Coordinator Service
 * @description Coordinates thread opening, closing, and state management for dashboard
 * @module shared/services
 */

import { Injectable, inject } from '@angular/core';
import { Router } from '@angular/router';
import { ThreadManagementService } from './thread-management.service';
import { DashboardStateService } from './dashboard-state.service';
import { UserTransformationService } from '@core/services/user-transformation/user-transformation.service';
import { type Message } from '@shared/dashboard-components/conversation-messages/conversation-messages.component';

@Injectable({ providedIn: 'root' })
export class DashboardThreadCoordinatorService {
  private router = inject(Router);
  private threadManagement = inject(ThreadManagementService);
  private dashboardState = inject(DashboardStateService);
  private userTransformation = inject(UserTransformationService);

  /**
   * Close thread if currently open
   * @description Checks if thread is open and closes it
   * @returns void
   */
  closeThreadIfOpen = (): void => {
    if (this.threadManagement.isThreadOpen()) {
      this.threadManagement.closeThread();
    }
  };

  /**
   * Close thread if needed
   * @description Closes thread if no threadId in URL and current thread matches type
   * @param previousId - Previous conversation ID
   * @param newId - New conversation ID
   * @param shouldKeep - Whether to keep thread open (based on threadId in URL)
   * @param isDM - Whether this is a DM thread
   * @returns void
   */
  closeThreadIfNeeded = (previousId: string | null, newId: string, shouldKeep: boolean, isDM: boolean): void => {
    if (shouldKeep) return;

    const info = this.threadManagement.threadInfo();
    if (info && info.isDirectMessage === isDM) {
      this.threadManagement.closeThread();
    }
  };

  /**
   * Close channel thread if needed
   * @description Closes any open channel thread when switching to DM view
   * @returns void
   */
  closeChannelThreadIfNeeded = (): void => {
    const info = this.threadManagement.threadInfo();
    if (info && !info.isDirectMessage) {
      this.threadManagement.closeThread();
    }
  };

  /**
   * Close DM thread if needed
   * @description Closes any open DM thread when switching to channel view
   * @returns void
   */
  closeDMThreadIfNeeded = (): void => {
    const info = this.threadManagement.threadInfo();
    if (info && info.isDirectMessage) {
      this.threadManagement.closeThread();
    }
  };

  /**
   * Open thread from URL parameters
   * @description Loads parent message and opens thread with 100ms delay for data loading
   * @param conversationId - Channel or DM conversation ID
   * @param threadId - Thread message ID
   * @param isDM - Whether this is a DM thread
   * @returns void
   */
  openThreadFromUrl = (conversationId: string, threadId: string, isDM: boolean): void => {
    setTimeout(() => {
      const message = isDM
        ? this.userTransformation.loadDMParentMessage(conversationId, threadId)
        : this.userTransformation.loadChannelParentMessage(conversationId, threadId);

      if (!message) return;

      const name = this.getConversationName(conversationId, isDM);
      this.threadManagement.openThread(threadId, message, conversationId, name, isDM);
    }, 100);
  };

  /**
   * Open thread from message click
   * @description Opens thread panel for specified message and updates URL
   * @param event - Thread request event containing messageId, parentMessage, and conversation details
   * @returns void
   */
  openThread = (event: {
    messageId: string;
    parentMessage: Message;
    conversationId?: string;
    isDirectMessage?: boolean;
  }): void => {
    const isDM = event.isDirectMessage || false;
    const { id, name } = this.resolveConversationDetails(event.conversationId, isDM);

    this.threadManagement.openThread(event.messageId, event.parentMessage, id, name, isDM);
    this.updateUrlWithThread(event.messageId, id, isDM);
  };

  /**
   * Close thread and update URL
   * @description Closes thread panel and removes thread parameter from URL
   * @returns void
   */
  closeThread = (): void => {
    this.threadManagement.closeThread();
    this.removeThreadFromUrl();
  };

  /**
   * Resolve conversation details
   * @description Gets conversation ID and name from event or current view
   * @param conversationId - Optional conversation ID from event
   * @param isDM - Whether this is a DM conversation
   * @returns Object containing conversation ID and name
   */
  private resolveConversationDetails = (
    conversationId: string | undefined,
    isDM: boolean
  ): { id: string; name: string } => {
    if (conversationId) {
      return { id: conversationId, name: this.getConversationName(conversationId, isDM) };
    }
    return this.getConversationFromCurrentView();
  };

  /**
   * Get conversation name
   * @description Retrieves conversation name from current state based on type
   * @param conversationId - Conversation ID (unused, kept for signature compatibility)
   * @param isDM - Whether this is a DM conversation
   * @returns Conversation name or empty string
   */
  private getConversationName = (conversationId: string, isDM: boolean): string => {
    if (isDM) {
      return this.dashboardState.selectedDM()?.userName || '';
    }
    return this.dashboardState.selectedChannel()?.name || '';
  };

  /**
   * Get conversation from current view
   * @description Extracts conversation details from currently active view state
   * @returns Object containing conversation ID and name, or empty values if no active conversation
   */
  private getConversationFromCurrentView = (): { id: string; name: string } => {
    const currentView = this.dashboardState.currentView();
    const selectedChannel = this.dashboardState.selectedChannel();
    const selectedDM = this.dashboardState.selectedDM();

    if (currentView === 'channel' && selectedChannel) {
      return { id: selectedChannel.id, name: selectedChannel.name };
    }
    if (currentView === 'direct-message' && selectedDM) {
      return { id: selectedDM.conversationId, name: selectedDM.userName };
    }
    return { id: '', name: '' };
  };

  /**
   * Update URL with thread parameter
   * @description Adds thread ID to URL if not already present
   * @param threadId - Thread message ID
   * @param conversationId - Channel or DM conversation ID
   * @param isDM - Whether this is a DM thread
   * @returns void
   */
  private updateUrlWithThread = (threadId: string, conversationId: string, isDM: boolean): void => {
    if (this.router.url.includes('/thread/')) return;

    const path = isDM ? 'dm' : 'channel';
    this.router.navigate(['/dashboard', path, conversationId, 'thread', threadId], {
      replaceUrl: true,
    });
  };

  /**
   * Remove thread from URL
   * @description Removes /thread/{id} segment from current URL
   * @returns void
   */
  private removeThreadFromUrl = (): void => {
    if (!this.router.url.includes('/thread/')) return;

    const urlParts = this.router.url.split('/thread/');
    if (urlParts.length > 0) {
      this.router.navigate([urlParts[0]], { replaceUrl: true });
    }
  };
}
