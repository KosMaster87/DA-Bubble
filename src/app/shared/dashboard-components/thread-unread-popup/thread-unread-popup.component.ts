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

  protected threadStore = inject(ThreadStore);
  protected channelMessageStore = inject(ChannelMessageStore);
  protected directMessageStore = inject(DirectMessageStore);
  protected unreadService = inject(UnreadService);
  private elementRef = inject(ElementRef);

  protected popupStyle = signal<Record<string, string>>({});

  ngAfterViewInit() {
    // Calculate popup position relative to the parent wrapper
    const popupElement = this.elementRef.nativeElement as HTMLElement;
    const wrapperElement = popupElement.parentElement;

    if (wrapperElement) {
      const rect = wrapperElement.getBoundingClientRect();
      this.popupStyle.set({
        top: `${rect.bottom + 8}px`,
        left: `${rect.left}px`,
      });
    }
  }

  /**
   * Get all unread threads for this conversation where user has participated
   */
  protected unreadThreads = computed(() => {
    const convId = this.conversationId();
    const userId = this.currentUserId();
    const isDM = this.isDirectMessage();

    if (!convId || !userId) return [];

    // Get all messages for this conversation
    const messages = isDM
      ? this.directMessageStore.messages()[convId] || []
      : this.channelMessageStore.getMessagesByChannel()(convId);

    const unreadThreads: UnreadThreadInfo[] = [];

    for (const msg of messages) {
      if (msg.lastThreadTimestamp) {
        // Get thread messages (only if already loaded)
        // Threads are loaded when opened, so this will work for threads user has viewed
        const threadMessages = this.threadStore.getThreadsByMessageId()(msg.id);

        // Check if user participated in this thread
        // User participated if:
        // 1. Wrote at least one thread reply OR
        // 2. Wrote the parent message (conversation starter)
        const wroteThreadReply = threadMessages.some((threadMsg) => threadMsg.authorId === userId);
        const wroteParentMessage = msg.authorId === userId;
        const userParticipated = wroteThreadReply || wroteParentMessage;

        // Only show threads where user participated
        if (userParticipated) {
          // Check if thread has unread messages
          const threadTime =
            msg.lastThreadTimestamp instanceof Date
              ? msg.lastThreadTimestamp
              : new Date(msg.lastThreadTimestamp);

          const hasUnread = this.unreadService.hasThreadUnread(convId, msg.id, threadTime);

          if (hasUnread) {
            unreadThreads.push({
              messageId: msg.id,
              parentMessageContent: this.truncateContent(msg.content, 50),
              threadCount: msg.threadCount || threadMessages.length,
              lastThreadTimestamp: threadTime,
              hasUnread: true,
              userParticipated: true,
            });
          }
        }
      }
    }

    // Sort by most recent first
    return unreadThreads.sort(
      (a, b) => b.lastThreadTimestamp.getTime() - a.lastThreadTimestamp.getTime()
    );
  });

  /**
   * Truncate long message content
   */
  private truncateContent(content: string, maxLength: number): string {
    if (content.length <= maxLength) return content;
    return content.substring(0, maxLength) + '...';
  }

  /**
   * Handle thread item click
   */
  protected onThreadClick(messageId: string): void {
    const convId = this.conversationId();
    const isDM = this.isDirectMessage();

    // Get the parent message
    const messages = isDM
      ? this.directMessageStore.messages()[convId] || []
      : this.channelMessageStore.getMessagesByChannel()(convId);

    const parentMessage = messages.find((msg) => msg.id === messageId);

    if (parentMessage) {
      // Cast to Message type for compatibility and include conversation context
      this.threadClicked.emit({
        messageId,
        parentMessage: parentMessage as Message,
        conversationId: convId,
        isDirectMessage: isDM,
      });
    }
  }

  /**
   * Format timestamp for display
   */
  protected formatTime(timestamp: Date): string {
    const now = new Date();
    const diff = now.getTime() - timestamp.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'Gerade eben';
    if (minutes < 60) return `Vor ${minutes} Min.`;
    if (hours < 24) return `Vor ${hours} Std.`;
    if (days < 7) return `Vor ${days} Tag${days > 1 ? 'en' : ''}`;

    return timestamp.toLocaleDateString('de-DE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  }
}
