/**
 * @fileoverview Dashboard Thread Coordinator Service
 * @description Facade service coordinating thread state and URL management
 * @module shared/services
 */

import { Injectable, inject } from '@angular/core';
import { type Message } from '@shared/dashboard-components/conversation-messages/conversation-messages.component';
import { ThreadStateCoordinatorService } from './thread-state-coordinator.service';
import { ThreadUrlCoordinatorService } from './thread-url-coordinator.service';

/**
 * Facade service for coordinating thread operations
 * Delegates to specialized services for state and URL management
 */
@Injectable({ providedIn: 'root' })
export class DashboardThreadCoordinatorService {
  private stateCoordinator = inject(ThreadStateCoordinatorService);
  private urlCoordinator = inject(ThreadUrlCoordinatorService);

  /**
   * Close thread if currently open
   */
  closeThreadIfOpen = (): void => {
    this.stateCoordinator.closeThreadIfOpen();
  };

  /**
   * Close thread if needed based on context
   */
  closeThreadIfNeeded = (
    previousId: string | null,
    newId: string,
    shouldKeep: boolean,
    isDM: boolean
  ): void => {
    this.stateCoordinator.closeThreadIfNeeded(previousId, newId, shouldKeep, isDM);
  };

  /**
   * Close channel thread if needed
   */
  closeChannelThreadIfNeeded = (): void => {
    this.stateCoordinator.closeChannelThreadIfNeeded();
  };

  /**
   * Close DM thread if needed
   */
  closeDMThreadIfNeeded = (): void => {
    this.stateCoordinator.closeDMThreadIfNeeded();
  };

  /**
   * Open thread from URL parameters
   */
  openThreadFromUrl = (conversationId: string, threadId: string, isDM: boolean): void => {
    this.stateCoordinator.openThreadFromUrl(conversationId, threadId, isDM);
  };

  /**
   * Open thread from message click
   */
  openThread = (event: {
    messageId: string;
    parentMessage: Message;
    conversationId?: string;
    isDirectMessage?: boolean;
  }): void => {
    const { id, isDM } = this.stateCoordinator.openThread(event);
    this.urlCoordinator.updateUrlWithThread(event.messageId, id, isDM);
  };

  /**
   * Close thread and update URL
   */
  closeThread = (): void => {
    this.stateCoordinator.closeThread();
    this.urlCoordinator.removeThreadFromUrl();
  };
}
