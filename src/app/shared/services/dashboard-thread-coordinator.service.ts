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
 * @description Bridges thread-state transitions and URL mutations so dashboard components can trigger thread flows through one facade.
 * Delegates to specialized services for state and URL management
 */
@Injectable({ providedIn: 'root' })
export class DashboardThreadCoordinatorService {
  private stateCoordinator = inject(ThreadStateCoordinatorService);
  private urlCoordinator = inject(ThreadUrlCoordinatorService);

  /**
   * Close thread if currently open
   * @description Forwards idempotent close requests to the state coordinator to safely tear down open thread context.
   */
  closeThreadIfOpen = (): void => {
    this.stateCoordinator.closeThreadIfOpen();
  };

  /**
   * Close thread if needed based on context
   * @description Applies context-aware close rules when conversation context changes and thread state should not be preserved.
   */
  closeThreadIfNeeded = (
    previousId: string | null,
    newId: string,
    shouldKeep: boolean,
    isDM: boolean,
  ): void => {
    this.stateCoordinator.closeThreadIfNeeded(previousId, newId, shouldKeep, isDM);
  };

  /**
   * Close channel thread if needed
   * @description Ensures channel-thread state is cleared when dashboard flow moves into direct-message context.
   */
  closeChannelThreadIfNeeded = (): void => {
    this.stateCoordinator.closeChannelThreadIfNeeded();
  };

  /**
   * Close DM thread if needed
   * @description Ensures direct-message thread state is cleared when dashboard flow moves into channel context.
   */
  closeDMThreadIfNeeded = (): void => {
    this.stateCoordinator.closeDMThreadIfNeeded();
  };

  /**
   * Open thread from URL parameters
   * @description Rehydrates thread state from route parameters so deep links resolve directly into the requested thread.
   */
  openThreadFromUrl = (conversationId: string, threadId: string, isDM: boolean): void => {
    this.stateCoordinator.openThreadFromUrl(conversationId, threadId, isDM);
  };

  /**
   * Open thread from message click
   * @description Opens thread state from UI interaction and synchronizes the route with the resolved conversation context.
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
   * @description Executes full thread-close flow by resetting thread state first and then removing thread route segments.
   */
  closeThread = (): void => {
    this.stateCoordinator.closeThread();
    this.urlCoordinator.removeThreadFromUrl();
  };
}
