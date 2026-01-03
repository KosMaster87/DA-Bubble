/**
 * @fileoverview Conversation Messages Component
 * @description Reusable component for displaying grouped messages with date separators
 * @module shared/dashboard-components/conversation-messages
 */

import {
  Component,
  input,
  output,
  signal,
  ViewChild,
  ElementRef,
  AfterViewChecked,
  effect,
  inject,
} from '@angular/core';
import { DatePipe } from '@angular/common';
import { ReactionBarComponent, type ReactionType } from '../reaction-bar/reaction-bar.component';
import { MessageEdit } from '../message-edit/message-edit';
import { ReactionCountingComponent } from '../reaction-counting/reaction-counting.component';
import { ChatScrollService } from '../../services';
import { UserPresenceStore } from '../../../stores';
import { MessageReaction } from '@core/models/message.model';

export interface Message {
  id: string;
  senderId: string;
  senderName: string;
  senderAvatar: string;
  content: string;
  timestamp: Date;
  isOwnMessage: boolean;
  reactions?: MessageReaction[];
  threadCount?: number;
  lastThreadTimestamp?: Date;
}

export interface MessageGroup {
  date: Date;
  label: string;
  messages: Message[];
}

@Component({
  selector: 'app-conversation-messages',
  imports: [DatePipe, ReactionBarComponent, MessageEdit, ReactionCountingComponent],
  templateUrl: './conversation-messages.component.html',
  styleUrl: './conversation-messages.component.scss',
})
export class ConversationMessagesComponent implements AfterViewChecked {
  @ViewChild('messagesContainer', { read: ElementRef }) messagesContainer?: ElementRef;

  conversationId = input.required<string>(); // Format: 'channel-{id}', 'thread-{id}', 'dm-{id}'
  messageGroups = input.required<MessageGroup[]>();
  isInThread = input<boolean>(false);
  messageClicked = output<string>();
  avatarClicked = output<string>();
  senderClicked = output<string>();
  reactionAdded = output<{ messageId: string; emoji: string }>();
  reactionBarClicked = output<{ messageId: string; type: ReactionType }>();
  threadClicked = output<string>();
  messageEdited = output<{ messageId: string; newContent: string }>();

  private chatScrollService = inject(ChatScrollService);
  protected userPresenceStore = inject(UserPresenceStore);

  protected editingMessageId = signal<string | null>(null);
  private shouldScrollToBottom = false;
  private lastMessageCount = 0;
  private lastScrollTop = 0;
  private scrollTimeout: any;

  constructor() {
    // Track when messages change
    effect(() => {
      const groups = this.messageGroups();
      const currentMessageCount = groups.reduce((sum, group) => sum + group.messages.length, 0);
      const conversationId = this.conversationId();
      const autoScrollEnabled = this.chatScrollService.getAutoScroll(conversationId);

      // console.log('📊 ConversationMessages: Effect triggered', {
      //   conversationId,
      //   currentMessageCount,
      //   lastMessageCount: this.lastMessageCount,
      //   autoScrollEnabled,
      // });

      // Scroll on initial load or when new messages arrive (only if auto-scroll is enabled)
      if (currentMessageCount !== this.lastMessageCount) {
        if (this.lastMessageCount === 0 && currentMessageCount > 0) {
          // Initial load - always scroll and mark as read
          // console.log('🎯 Initial load detected - will scroll to bottom');
          this.shouldScrollToBottom = true;
          const latestMessageId = this.getLatestMessageId();
          if (latestMessageId) {
            this.chatScrollService.enterConversation(conversationId, latestMessageId);
          }
        } else if (currentMessageCount > this.lastMessageCount && autoScrollEnabled) {
          // New messages arrived and auto-scroll is enabled
          // console.log('📩 New messages arrived - will scroll to bottom');
          this.shouldScrollToBottom = true;
          const latestMessageId = this.getLatestMessageId();
          if (latestMessageId) {
            this.chatScrollService.markAsRead(conversationId, latestMessageId);
          }
        } else if (currentMessageCount > this.lastMessageCount && !autoScrollEnabled) {
          // console.log('⚠️ New messages arrived but auto-scroll is OFF');
        }
      }
      this.lastMessageCount = currentMessageCount;
    });
  }

  ngAfterViewChecked(): void {
    if (this.shouldScrollToBottom) {
      this.scrollToBottom();
      this.shouldScrollToBottom = false;
    }
  }

  /**
   * Scroll to bottom of messages
   */
  private scrollToBottom(): void {
    if (this.messagesContainer?.nativeElement) {
      // Use setTimeout to ensure DOM is fully rendered
      setTimeout(() => {
        try {
          const container = this.messagesContainer!.nativeElement;
          const scrollHeight = container.scrollHeight;
          const clientHeight = container.clientHeight;
          const targetScrollTop = scrollHeight - clientHeight;

          // console.log('⬇️ Attempting to scroll to bottom', {
          //   scrollHeight,
          //   clientHeight,
          //   targetScrollTop,
          //   currentScrollTop: container.scrollTop,
          // });

          if (targetScrollTop > 0) {
            // Use smooth scrolling
            container.scrollTo({
              top: targetScrollTop,
              behavior: 'instant', // instant for immediate feedback
            });
            this.lastScrollTop = targetScrollTop;
            // console.log('✅ Scrolled to bottom successfully');
          } else {
            // console.warn('⚠️ No scrolling needed - content fits in viewport');
          }
        } catch (err) {
          console.error('❌ Scroll to bottom failed:', err);
        }
      }, 0);
    } else {
      console.warn('⚠️ scrollToBottom: messagesContainer not found');
    }
  }

  /**
   * Handle scroll event to detect manual scrolling
   */
  onScroll(): void {
    if (!this.messagesContainer?.nativeElement) {
      return;
    }

    // Debounce scroll events
    if (this.scrollTimeout) {
      clearTimeout(this.scrollTimeout);
    }

    this.scrollTimeout = setTimeout(() => {
      const container = this.messagesContainer!.nativeElement;
      const scrollTop = container.scrollTop;
      const scrollHeight = container.scrollHeight;
      const clientHeight = container.clientHeight;
      const distanceFromBottom = scrollHeight - scrollTop - clientHeight;
      const isAtBottom = distanceFromBottom < 50;
      const conversationId = this.conversationId();

      // Only change autoScrollEnabled if there was actual user interaction
      // Check if scroll position changed from last known position
      if (Math.abs(scrollTop - this.lastScrollTop) > 5) {
        if (isAtBottom) {
          // User scrolled to bottom manually - enable auto-scroll
          this.chatScrollService.setAutoScroll(conversationId, true);

          // Mark latest message as read
          const latestMessageId = this.getLatestMessageId();
          if (latestMessageId) {
            this.chatScrollService.markAsRead(conversationId, latestMessageId);
          }
        } else {
          // User scrolled up - disable auto-scroll
          this.chatScrollService.setAutoScroll(conversationId, false);
        }
        this.lastScrollTop = scrollTop;
      }
    }, 100);
  }

  /**
   * Get the ID of the latest message
   */
  private getLatestMessageId(): string | null {
    const groups = this.messageGroups();
    if (groups.length === 0) return null;

    const lastGroup = groups[groups.length - 1];
    if (lastGroup.messages.length === 0) return null;

    const lastMessage = lastGroup.messages[lastGroup.messages.length - 1];
    return lastMessage.id;
  }

  /**
   * Handle message click
   */
  onMessageClick(messageId: string): void {
    this.messageClicked.emit(messageId);
  }

  /**
   * Handle avatar click
   */
  onAvatarClick(senderId: string): void {
    this.avatarClicked.emit(senderId);
  }

  /**
   * Handle sender name click
   */
  onSenderClick(senderId: string): void {
    this.senderClicked.emit(senderId);
  }

  /**
   * Handle reaction click
   */
  onReactionClick(messageId: string, emoji: string): void {
    this.reactionAdded.emit({ messageId, emoji });
  }

  /**
   * Handle reaction bar button click
   */
  onReactionBarClick(messageId: string, type: ReactionType): void {
    console.log('🔵 Reaction bar clicked:', messageId, type);
    if (type === 'comment') {
      this.threadClicked.emit(messageId);
    } else if (type === 'add-reaction') {
      // Add-reaction button opens picker in ReactionBar, no need to emit
      console.log('Emoji picker opened');
    } else {
      // Direct emoji click (thumbs-up, checked, rocket, nerd-face)
      console.log('🎯 Emitting reaction:', messageId, type);
      this.reactionAdded.emit({ messageId, emoji: type });
    }
  }

  /**
   * Handle thread button click
   */
  onThreadClick(messageId: string): void {
    this.threadClicked.emit(messageId);
  }

  /**
   * Handle edit message request
   */
  onEditMessage(messageId: string): void {
    this.editingMessageId.set(messageId);
  }

  /**
   * Handle cancel edit
   */
  onCancelEdit(): void {
    this.editingMessageId.set(null);
  }

  /**
   * Handle save edited message
   */
  onSaveEdit(messageId: string, newContent: string): void {
    this.messageEdited.emit({ messageId, newContent });
    this.editingMessageId.set(null);
  }

  /**
   * Check if message is being edited
   */
  isEditing(messageId: string): boolean {
    return this.editingMessageId() === messageId;
  }
}
