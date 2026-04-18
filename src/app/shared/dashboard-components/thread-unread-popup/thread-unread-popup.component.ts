/**
 * @fileoverview Thread Unread Popup Component
 * @description Shows list of unread threads when hovering over thread-unread indicator
 * @module shared/dashboard-components/thread-unread-popup
 */

import { CommonModule } from '@angular/common';
import {
  Component,
  computed,
  effect,
  ElementRef,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { DirectMessage } from '@core/models/direct-message.model';
import { Message } from '@core/models/message.model';
import { UnreadService } from '@core/services/unread/unread.service';
import { ChannelMessageStore, DirectMessageStore, ThreadStore } from '@stores/index';
import { type ThreadMessage } from '@stores/threads/thread.store';

type ThreadParentMessage =
  | Pick<Message, 'id' | 'content' | 'authorId' | 'lastThreadTimestamp'>
  | Pick<DirectMessage, 'id' | 'content' | 'authorId' | 'lastThreadTimestamp'>;

export interface UnreadThreadInfo {
  messageId: string;
  channelId: string; // Channel ID where the thread belongs
  parentMessageContent: string; // Content of the parent message
  unreadMessageCount: number;
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

  /**
   * Preload unread thread snapshots while the popup is open.
   *
   * Why this eager preload exists:
   * The popup should show precise unread reply counts immediately, not only after the
   * next live update; loading candidate threads here keeps hover UX deterministic.
   */
  private preloadThreadSnapshotsEffect = effect(() => {
    const convId = this.conversationId();
    const userId = this.currentUserId();
    const isDM = this.isDirectMessage();

    if (!convId || !userId) return;

    const messages = this.getMessagesForConversation(convId, isDM);
    const unreadThreadParents = messages.filter((message) =>
      this.shouldPreloadUnreadThread(message, convId),
    );

    unreadThreadParents.forEach((message) => {
      this.threadStore.loadThreads(convId, message.id, isDM);
    });
  });

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
   * @description
   * Shared accessor avoids branching in downstream collectors and keeps DM/channel
   * behavior consistent for unread thread evaluation.
   */
  private getMessagesForConversation = (convId: string, isDM: boolean): ThreadParentMessage[] => {
    return isDM
      ? this.directMessageStore.messages()[convId] || []
      : this.channelMessageStore.getMessagesByChannel()(convId);
  };

  /**
   * Collect all unread threads where user participated
   * @description
   * Participation is evaluated before unread checks to avoid work for threads that are
   * not relevant to the current user.
   */
  private collectUnreadThreads = (
    messages: ThreadParentMessage[],
    convId: string,
    userId: string,
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
   * @description
   * We guard early on parent metadata to avoid requesting thread state for messages
   * that cannot produce thread-unread indicators.
   */
  private hasThreadActivity = (msg: ThreadParentMessage): boolean => {
    return !!msg.lastThreadTimestamp;
  };

  /**
   * Preload thread snapshots for unread parent messages while the popup is visible.
   * @description
   * This intentionally reuses unread tracker logic to keep preload and final badge
   * calculation aligned.
   */
  private shouldPreloadUnreadThread = (
    message: ThreadParentMessage,
    conversationId: string,
  ): boolean => {
    if (!this.hasThreadActivity(message)) return false;

    const threadTime = this.normalizeTimestamp(message.lastThreadTimestamp!);
    return this.unreadService.hasThreadUnread(conversationId, message.id, threadTime);
  };

  /**
   * Process thread message and return info if unread and user participated
   * @description
   * Returns null for non-relevant rows so callers can build a compact unread list
   * without extra filtering passes.
   */
  private processThreadMessage = (
    msg: ThreadParentMessage,
    convId: string,
    userId: string,
  ): UnreadThreadInfo | null => {
    const threadMessages = this.threadStore.getThreadsByMessageId()(msg.id);

    if (!this.didUserParticipate(msg, threadMessages, userId)) {
      return null;
    }

    const threadTime = this.normalizeTimestamp(msg.lastThreadTimestamp!);
    const hasUnread = this.unreadService.hasThreadUnread(convId, msg.id, threadTime);

    return hasUnread
      ? this.createThreadInfo(msg, threadMessages, threadTime, convId, userId)
      : null;
  };

  /**
   * Check if user participated in thread
   */
  private didUserParticipate = (
    msg: ThreadParentMessage,
    threadMessages: ThreadMessage[],
    userId: string,
  ): boolean => {
    const wroteThreadReply = threadMessages.some((threadMsg) => threadMsg.authorId === userId);
    const wroteParentMessage = msg.authorId === userId;
    return wroteThreadReply || wroteParentMessage;
  };

  /**
   * Normalize timestamp to Date object
   */
  private normalizeTimestamp = (timestamp: Date | string | number): Date => {
    return timestamp instanceof Date ? timestamp : new Date(timestamp);
  };

  /**
   * Create UnreadThreadInfo object
   */
  private createThreadInfo = (
    msg: ThreadParentMessage,
    threadMessages: ThreadMessage[],
    threadTime: Date,
    channelId: string,
    userId: string,
  ): UnreadThreadInfo => {
    return {
      messageId: msg.id,
      channelId: channelId,
      parentMessageContent: this.truncateContent(msg.content, 50),
      unreadMessageCount: this.calculateUnreadThreadMessageCount(
        channelId,
        msg.id,
        threadMessages,
        userId,
      ),
      lastThreadTimestamp: threadTime,
      hasUnread: true,
      userParticipated: true,
    };
  };

  /**
   * Count unread thread replies for current user.
   * @description
   * Returns at least 1 when the parent is marked unread but reply snapshots are still
   * incomplete, preventing false zero badges in transitional states.
   */
  private calculateUnreadThreadMessageCount = (
    conversationId: string,
    parentMessageId: string,
    threadMessages: ThreadMessage[],
    userId: string,
  ): number => {
    if (!threadMessages.length) return 1;

    const unreadCount = threadMessages.filter((threadMsg) => {
      if (threadMsg.authorId === userId) return false;
      const timestamp = this.normalizeTimestamp(threadMsg.createdAt);
      return this.unreadService.hasThreadUnread(conversationId, parentMessageId, timestamp);
    }).length;

    return unreadCount > 0 ? unreadCount : 1;
  };

  /**
   * Sort threads by most recent first
   */
  private sortThreadsByMostRecent = (threads: UnreadThreadInfo[]): UnreadThreadInfo[] => {
    return threads.sort(
      (a, b) => b.lastThreadTimestamp.getTime() - a.lastThreadTimestamp.getTime(),
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
   * @description
   * The click payload carries the resolved conversation ID from thread info so callers
   * navigate correctly in both DM and channel contexts.
   */
  protected onThreadClick = (messageId: string): void => {
    const isDM = this.isDirectMessage();

    // Find the thread info to get the correct channel ID
    const threads = this.unreadThreads();
    const threadInfo = threads.find((t) => t.messageId === messageId);

    if (!threadInfo) return;

    const convId = threadInfo.channelId; // Use channelId from thread info
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
    isDM: boolean,
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
    isDirectMessage: boolean,
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
    timestamp: Date,
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
