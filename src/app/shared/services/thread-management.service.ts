/**
 * @fileoverview Thread Management Service
 * @description Manages thread panel state and operations
 * @module shared/services/thread-management
 */

import { Injectable, inject, signal, computed } from '@angular/core';
import { UnreadService } from '@core/services/unread/unread.service';
import { UserTransformationService } from '@core/services/user-transformation/user-transformation.service';
import { ChannelMessageStore, DirectMessageStore } from '@stores/index';
import { type Message } from '@shared/dashboard-components/conversation-messages/conversation-messages.component';

export interface ThreadInfo {
  channelId: string;
  parentMessageId: string;
  channelName: string;
  parentMessage: Message;
  isDirectMessage: boolean;
}

@Injectable({
  providedIn: 'root',
})
export class ThreadManagementService {
  private unreadService = inject(UnreadService);
  private userTransformation = inject(UserTransformationService);
  private channelMessageStore = inject(ChannelMessageStore);
  private directMessageStore = inject(DirectMessageStore);

  private _isThreadOpen = signal<boolean>(false);
  private _threadMessageId = signal<string | null>(null);
  private _baseThreadInfo = signal<ThreadInfo | null>(null);

  readonly isThreadOpen = this._isThreadOpen.asReadonly();
  readonly threadMessageId = this._threadMessageId.asReadonly();

  /**
   * Thread info with live parent message updates from store
   */
  readonly threadInfo = computed(() => {
    const baseInfo = this._baseThreadInfo();
    if (!baseInfo) return null;

    const updatedMessage = this.getUpdatedParentMessage(
      baseInfo.channelId,
      baseInfo.parentMessageId,
      baseInfo.isDirectMessage
    );

    return updatedMessage
      ? { ...baseInfo, parentMessage: updatedMessage }
      : baseInfo;
  });

  /**
   * Open thread panel and mark thread as read
   * @param messageId - Parent message ID
   * @param parentMessage - Parent message data
   * @param channelId - Channel or conversation ID
   * @param channelName - Channel or user name
   * @param isDirectMessage - Whether this is a DM thread
   */
  openThread(
    messageId: string,
    parentMessage: Message,
    channelId: string,
    channelName: string,
    isDirectMessage: boolean
  ): void {
    console.log('🟢 ThreadManagement.openThread() called:', { messageId, channelId, channelName, isDirectMessage });
    this._threadMessageId.set(messageId);
    this._baseThreadInfo.set({
      channelId,
      parentMessageId: messageId,
      channelName,
      parentMessage,
      isDirectMessage,
    });
    this._isThreadOpen.set(true);
    console.log('🟢 After setting signals - isThreadOpen:', this._isThreadOpen(), 'threadInfo:', this.threadInfo());

    if (channelId && messageId) {
      this.unreadService.markThreadAndParentAsRead(channelId, messageId);
    }
  }

  /**
   * Close thread panel and reset thread state
   */
  closeThread(): void {
    console.log('🟠 ThreadManagement.closeThread() called from:', new Error().stack);
    this._isThreadOpen.set(false);
    this._threadMessageId.set(null);
    this._baseThreadInfo.set(null);
  }

  /**
   * Get updated parent message from store
   * @param channelId - Channel or conversation ID
   * @param messageId - Message ID
   * @param isDirectMessage - Whether this is a DM
   * @returns Updated message or undefined
   */
  private getUpdatedParentMessage(
    channelId: string,
    messageId: string,
    isDirectMessage: boolean
  ): Message | undefined {
    if (isDirectMessage) {
      const rawMessages = this.directMessageStore.messages()[channelId] || [];
      const rawMessage = rawMessages.find((msg) => msg.id === messageId);
      if (!rawMessage) return undefined;
      const transformed = this.userTransformation.directMessagesToViewMessages([rawMessage]);
      return transformed[0] as Message;
    } else {
      const rawMessages = this.channelMessageStore.getMessagesByChannel()(channelId);
      const rawMessage = rawMessages.find((msg) => msg.id === messageId);
      if (!rawMessage) return undefined;
      const transformed = this.userTransformation.channelMessagesToViewMessages([rawMessage as any]);
      return transformed[0] as Message;
    }
  }
}
