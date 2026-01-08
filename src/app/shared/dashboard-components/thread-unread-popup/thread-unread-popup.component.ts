/**
 * @fileoverview Thread Unread Popup Component
 * @description Shows list of unread threads when hovering over thread-unread indicator
 * @module shared/dashboard-components/thread-unread-popup
 */

import {
  Component,
  input,
  inject,
  computed,
  ElementRef,
  signal,
  output,
  effect,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { ThreadStore, ChannelMessageStore, DirectMessageStore } from '@stores/index';
import { Message } from '@core/models/message.model';
import { DirectMessage } from '@core/models/direct-message.model';
import { UnreadService } from '@core/services/unread/unread.service';

export interface UnreadThreadInfo {
  messageId: string;
  parentMessageContent: string; // Content of the parent message
  threadCount: number;
  lastThreadTimestamp: Date;
  hasUnread: boolean;
  userParticipated: boolean; // Whether current user wrote in this thread
}

@Component({
  selector: 'app-thread-unread-popup',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './thread-unread-popup.component.html',
  styleUrl: './thread-unread-popup.component.scss',
})
export class ThreadUnreadPopupComponent {
  conversationId = input.required<string>();
  currentUserId = input.required<string>();
  isDirectMessage = input<boolean>(false);

  threadClicked = output<{
    messageId: string;
    parentMessage: Message;
    conversationId: string;
    isDirectMessage: boolean;
  }>();

  private elementRef = inject(ElementRef);

  protected threadStore = inject(ThreadStore);
  protected channelMessageStore = inject(ChannelMessageStore);
  protected directMessageStore = inject(DirectMessageStore);
  protected unreadService = inject(UnreadService);
  protected popupStyle = signal<Record<string, string>>({});

  ngAfterViewInit() {
    this.calculatePopupPosition();
  }

  /**
   * Calculate and set popup position relative to parent wrapper
   */
  private calculatePopupPosition = (): void => {
    const popupElement = this.elementRef.nativeElement as HTMLElement;
    const wrapperElement = popupElement.parentElement;

    if (wrapperElement) {
      const rect = wrapperElement.getBoundingClientRect();
      this.popupStyle.set({
        top: `${rect.bottom + 8}px`,
        left: `${rect.left}px`,
      });
    }
  };

  /**
   * Get all unread threads for this conversation where user has participated
   */
  protected unreadThreads = computed(() => {
    const convId = this.conversationId();
    const userId = this.currentUserId();
    const isDM = this.isDirectMessage();

    if (!convId || !userId) return [];

    const messages = this.getMessagesForConversation(convId, isDM);
    const unreadThreads = this.collectUnreadThreads(messages, convId, userId);

    return this.sortThreadsByMostRecent(unreadThreads);
  });

  /**
   * Get messages for conversation (DM or channel)
   */
  private getMessagesForConversation = (convId: string, isDM: boolean): any[] => {
    return isDM
      ? this.directMessageStore.messages()[convId] || []
      : this.channelMessageStore.getMessagesByChannel()(convId);
  };

  /**
   * Collect all unread threads where user participated
   */
  private collectUnreadThreads = (
    messages: any[],
    convId: string,
    userId: string
  ): UnreadThreadInfo[] => {
    const unreadThreads: UnreadThreadInfo[] = [];

    for (const msg of messages) {
      if (this.hasThreadActivity(msg)) {
        const threadInfo = this.processThreadMessage(msg, convId, userId);
        if (threadInfo) {
          unreadThreads.push(threadInfo);
        }
      }
    }

    return unreadThreads;
  };

  /**
   * Check if message has thread activity
   */
  private hasThreadActivity = (msg: any): boolean => {
    return !!msg.lastThreadTimestamp;
  };

  /**
   * Process thread message and return info if unread and user participated
   */
  private processThreadMessage = (
    msg: any,
    convId: string,
    userId: string
  ): UnreadThreadInfo | null => {
    const threadMessages = this.threadStore.getThreadsByMessageId()(msg.id);

    if (!this.didUserParticipate(msg, threadMessages, userId)) {
      return null;
    }

    const threadTime = this.normalizeTimestamp(msg.lastThreadTimestamp);
    const hasUnread = this.unreadService.hasThreadUnread(convId, msg.id, threadTime);

    return hasUnread ? this.createThreadInfo(msg, threadMessages, threadTime) : null;
  };

  /**
   * Check if user participated in thread
   */
  private didUserParticipate = (msg: any, threadMessages: any[], userId: string): boolean => {
    const wroteThreadReply = threadMessages.some((threadMsg) => threadMsg.authorId === userId);
    const wroteParentMessage = msg.authorId === userId;
    return wroteThreadReply || wroteParentMessage;
  };

  /**
   * Normalize timestamp to Date object
   */
  private normalizeTimestamp = (timestamp: any): Date => {
    return timestamp instanceof Date ? timestamp : new Date(timestamp);
  };

  /**
   * Create UnreadThreadInfo object
   */
  private createThreadInfo = (
    msg: any,
    threadMessages: any[],
    threadTime: Date
  ): UnreadThreadInfo => {
    return {
      messageId: msg.id,
      parentMessageContent: this.truncateContent(msg.content, 50),
      threadCount: msg.threadCount || threadMessages.length,
      lastThreadTimestamp: threadTime,
      hasUnread: true,
      userParticipated: true,
    };
  };

  /**
   * Sort threads by most recent first
   */
  private sortThreadsByMostRecent = (threads: UnreadThreadInfo[]): UnreadThreadInfo[] => {
    return threads.sort(
      (a, b) => b.lastThreadTimestamp.getTime() - a.lastThreadTimestamp.getTime()
    );
  };

  /**
   * Truncate long message content
   */
  private truncateContent = (content: string, maxLength: number): string => {
    if (content.length <= maxLength) return content;
    return content.substring(0, maxLength) + '...';
  };

  /**
   * Handle thread item click
   */
  protected onThreadClick = (messageId: string): void => {
    const convId = this.conversationId();
    const isDM = this.isDirectMessage();
    const parentMessage = this.getParentMessage(convId, messageId, isDM);

    if (parentMessage) {
      this.emitThreadClickEvent(messageId, parentMessage, convId, isDM);
    }
  };

  /**
   * Get parent message from store
   */
  private getParentMessage = (
    convId: string,
    messageId: string,
    isDM: boolean
  ): Message | DirectMessage | undefined => {
    const messages = isDM
      ? this.directMessageStore.messages()[convId] || []
      : this.channelMessageStore.getMessagesByChannel()(convId);
    return messages.find((msg) => msg.id === messageId);
  };

  /**
   * Emit thread clicked event with message data
   */
  private emitThreadClickEvent = (
    messageId: string,
    parentMessage: Message | DirectMessage,
    conversationId: string,
    isDirectMessage: boolean
  ): void => {
    this.threadClicked.emit({
      messageId,
      parentMessage: parentMessage as Message,
      conversationId,
      isDirectMessage,
    });
  };

  /**
   * Format timestamp for display
   */
  protected formatTime = (timestamp: Date): string => {
    const diff = new Date().getTime() - timestamp.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    return this.getTimeLabel(minutes, hours, days, timestamp);
  };

  /**
   * Get appropriate time label based on time differences
   */
  private getTimeLabel = (
    minutes: number,
    hours: number,
    days: number,
    timestamp: Date
  ): string => {
    if (minutes < 1) return 'Gerade eben';
    if (minutes < 60) return `Vor ${minutes} Min.`;
    if (hours < 24) return `Vor ${hours} Std.`;
    if (days < 7) return `Vor ${days} Tag${days > 1 ? 'en' : ''}`;

    return timestamp.toLocaleDateString('de-DE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  };
}
