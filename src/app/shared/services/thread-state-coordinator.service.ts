/**
 * @fileoverview Thread State Coordinator Service
 * @description Manages thread opening, closing, and state validation
 * @module shared/services
 */

import { Injectable, inject } from '@angular/core';
import { ThreadManagementService } from './thread-management.service';
import { DashboardStateService } from './dashboard-state.service';
import { UserTransformationService } from '@core/services/user-transformation/user-transformation.service';
import { type Message } from '@shared/dashboard-components/conversation-messages/conversation-messages.component';

/**
 * Service for managing thread state operations
 */
@Injectable({ providedIn: 'root' })
export class ThreadStateCoordinatorService {
  private threadManagement = inject(ThreadManagementService);
  private dashboardState = inject(DashboardStateService);
  private userTransformation = inject(UserTransformationService);

  /**
   * Close thread if currently open
   * @description Checks if thread is open and closes it
   */
  closeThreadIfOpen = (): void => {
    if (this.threadManagement.isThreadOpen()) {
      this.threadManagement.closeThread();
    }
  };

  /**
   * Close thread if needed based on context
   * @param previousId Previous conversation ID
   * @param newId New conversation ID
   * @param shouldKeep Whether to keep thread open (based on threadId in URL)
   * @param isDM Whether this is a DM thread
   */
  closeThreadIfNeeded = (
    previousId: string | null,
    newId: string,
    shouldKeep: boolean,
    isDM: boolean
  ): void => {
    if (shouldKeep) return;

    const info = this.threadManagement.threadInfo();
    if (info && info.isDirectMessage === isDM) {
      this.threadManagement.closeThread();
    }
  };

  /**
   * Close channel thread if needed
   * @description Closes any open channel thread when switching to DM view
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
   */
  closeDMThreadIfNeeded = (): void => {
    const info = this.threadManagement.threadInfo();
    if (info && info.isDirectMessage) {
      this.threadManagement.closeThread();
    }
  };

  /**
   * Open thread from URL parameters
   * @param conversationId Channel or DM conversation ID
   * @param threadId Thread message ID
   * @param isDM Whether this is a DM thread
   */
  openThreadFromUrl = (conversationId: string, threadId: string, isDM: boolean): void => {
    setTimeout(() => {
      const message = this.loadParentMessage(conversationId, threadId, isDM);
      if (!message) return;

      const name = this.getConversationName(conversationId, isDM);
      this.threadManagement.openThread(threadId, message, conversationId, name, isDM);
    }, 100);
  };

  /**
   * Open thread from message click
   * @param event Thread request event
   * @returns Resolved conversation details for URL update
   */
  openThread = (event: {
    messageId: string;
    parentMessage: Message;
    conversationId?: string;
    isDirectMessage?: boolean;
  }): { id: string; name: string; isDM: boolean } => {
    const isDM = event.isDirectMessage || false;
    const { id, name } = this.resolveConversationDetails(event.conversationId, isDM);

    this.threadManagement.openThread(event.messageId, event.parentMessage, id, name, isDM);

    return { id, name, isDM };
  };

  /**
   * Close thread
   */
  closeThread = (): void => {
    this.threadManagement.closeThread();
  };

  /**
   * Load parent message for thread
   * @param conversationId Conversation ID
   * @param threadId Thread message ID
   * @param isDM Whether this is a DM
   * @returns Parent message or null
   */
  private loadParentMessage(conversationId: string, threadId: string, isDM: boolean): Message | null {
    return isDM
      ? this.userTransformation.loadDMParentMessage(conversationId, threadId)
      : this.userTransformation.loadChannelParentMessage(conversationId, threadId);
  }

  /**
   * Resolve conversation details
   * @param conversationId Optional conversation ID from event
   * @param isDM Whether this is a DM conversation
   * @returns Object containing conversation ID and name
   */
  private resolveConversationDetails(
    conversationId: string | undefined,
    isDM: boolean
  ): { id: string; name: string } {
    if (conversationId) {
      return { id: conversationId, name: this.getConversationName(conversationId, isDM) };
    }
    return this.getConversationFromCurrentView();
  }

  /**
   * Get conversation name
   * @param conversationId Conversation ID
   * @param isDM Whether this is a DM conversation
   * @returns Conversation name or empty string
   */
  private getConversationName(conversationId: string, isDM: boolean): string {
    if (isDM) {
      return this.dashboardState.selectedDM()?.userName || '';
    }
    return this.dashboardState.selectedChannel()?.name || '';
  }

  /**
   * Get conversation from current view
   * @returns Object containing conversation ID and name
   */
  private getConversationFromCurrentView(): { id: string; name: string } {
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
  }
}
