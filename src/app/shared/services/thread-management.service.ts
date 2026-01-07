/**
 * @fileoverview Thread Management Service
 * @description Manages thread panel state and operations
 * @module shared/services/thread-management
 */

import { Injectable, inject, signal } from '@angular/core';
import { UnreadService } from '@core/services/unread/unread.service';
import { type Message } from '@shared/dashboard-components/conversation-messages/conversation-messages.component';

export interface ThreadInfo {
  channelId: string;
  parentMessageId: string;
  channelName: string;
  parentMessage: Message;
  isDirectMessage: boolean;
}

/**
 * Service for managing thread panel state
 */
@Injectable({
  providedIn: 'root',
})
export class ThreadManagementService {
  private unreadService = inject(UnreadService);

  // Thread state signals
  private _isThreadOpen = signal<boolean>(false);
  private _threadMessageId = signal<string | null>(null);
  private _threadInfo = signal<ThreadInfo | null>(null);

  // Public readonly signals
  readonly isThreadOpen = this._isThreadOpen.asReadonly();
  readonly threadMessageId = this._threadMessageId.asReadonly();
  readonly threadInfo = this._threadInfo.asReadonly();

  /**
   * Open thread panel
   * @param messageId Parent message ID
   * @param parentMessage Parent message data
   * @param channelId Channel or conversation ID
   * @param channelName Channel or user name
   * @param isDirectMessage Whether this is a DM thread
   */
  openThread(
    messageId: string,
    parentMessage: Message,
    channelId: string,
    channelName: string,
    isDirectMessage: boolean
  ): void {
    this._threadMessageId.set(messageId);
    this._threadInfo.set({
      channelId,
      parentMessageId: messageId,
      channelName,
      parentMessage,
      isDirectMessage,
    });
    this._isThreadOpen.set(true);

    // Mark thread AND parent message as read when opening thread
    // This ensures both thread icon and parent message are marked as read
    if (channelId && messageId) {
      this.unreadService.markThreadAndParentAsRead(channelId, messageId);
    }
  }

  /**
   * Close thread panel
   */
  closeThread(): void {
    this._isThreadOpen.set(false);
    this._threadMessageId.set(null);
    this._threadInfo.set(null);
  }
}
