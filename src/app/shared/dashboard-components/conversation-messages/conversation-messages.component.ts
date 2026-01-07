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
import { DeleteMessageModalComponent } from '../delete-message-modal/delete-message-modal.component';
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
  isEdited?: boolean;
  editedAt?: Date;
}

export interface MessageGroup {
  date: Date;
  label: string;
  messages: Message[];
}

@Component({
  selector: 'app-conversation-messages',
  imports: [
    DatePipe,
    ReactionBarComponent,
    MessageEdit,
    ReactionCountingComponent,
    DeleteMessageModalComponent,
  ],
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
  messageDeleted = output<string>();

  private chatScrollService = inject(ChatScrollService);
  protected userPresenceStore = inject(UserPresenceStore);

  protected editingMessageId = signal<string | null>(null);
  protected deleteConfirmationMessageId = signal<string | null>(null);
  private shouldScrollToBottom = false;
  private lastMessageCount = 0;
  private lastScrollTop = 0;
  private scrollTimeout: any;

  constructor() {
    this.setupMessageChangeEffect();
  }

  /**
   * Setup effect to track message changes and auto-scroll
   */
  private setupMessageChangeEffect = (): void => {
    effect(() => {
      const currentMessageCount = this.getCurrentMessageCount();
      const conversationId = this.conversationId();
      const autoScrollEnabled = this.chatScrollService.getAutoScroll(conversationId);

      if (currentMessageCount !== this.lastMessageCount) {
        this.handleMessageCountChange(conversationId, currentMessageCount, autoScrollEnabled);
      }
      this.lastMessageCount = currentMessageCount;
    });
  };

  /**
   * Get current total message count from all groups
   */
  private getCurrentMessageCount = (): number => {
    const groups = this.messageGroups();
    return groups.reduce((sum, group) => sum + group.messages.length, 0);
  };

  /**
   * Handle message count change (initial load or new messages)
   */
  private handleMessageCountChange = (
    conversationId: string,
    currentCount: number,
    autoScrollEnabled: boolean
  ): void => {
    if (this.isInitialLoad(currentCount)) {
      this.handleInitialLoad(conversationId);
    } else if (this.shouldAutoScrollForNewMessages(currentCount, autoScrollEnabled)) {
      this.handleNewMessages(conversationId);
    }
  };

  /**
   * Check if this is initial load
   */
  private isInitialLoad = (currentCount: number): boolean => {
    return this.lastMessageCount === 0 && currentCount > 0;
  };

  /**
   * Check if should auto-scroll for new messages
   */
  private shouldAutoScrollForNewMessages = (
    currentCount: number,
    autoScrollEnabled: boolean
  ): boolean => {
    return currentCount > this.lastMessageCount && autoScrollEnabled;
  };

  /**
   * Handle initial load - scroll and mark as read
   */
  private handleInitialLoad = (conversationId: string): void => {
    this.shouldScrollToBottom = true;
    const latestMessageId = this.getLatestMessageId();
    if (latestMessageId) {
      this.chatScrollService.enterConversation(conversationId, latestMessageId);
    }
  };

  /**
   * Handle new messages - scroll and mark as read
   */
  private handleNewMessages = (conversationId: string): void => {
    this.shouldScrollToBottom = true;
    const latestMessageId = this.getLatestMessageId();
    if (latestMessageId) {
      this.chatScrollService.markAsRead(conversationId, latestMessageId);
    }
  };

  ngAfterViewChecked(): void {
    if (this.shouldScrollToBottom) {
      this.scrollToBottom();
      this.shouldScrollToBottom = false;
    }
  }

  /**
   * Scroll to bottom of messages
   */
  private scrollToBottom = (): void => {
    if (!this.messagesContainer?.nativeElement) {
      console.warn('⚠️ scrollToBottom: messagesContainer not found');
      return;
    }

    setTimeout(() => this.performScroll(), 0);
  };

  /**
   * Perform actual scroll operation
   */
  private performScroll = (): void => {
    try {
      const container = this.messagesContainer!.nativeElement;
      const targetScrollTop = this.calculateTargetScrollTop(container);

      if (targetScrollTop > 0) {
        this.scrollToTarget(container, targetScrollTop);
      }
    } catch (err) {
      console.error('❌ Scroll to bottom failed:', err);
    }
  };

  /**
   * Calculate target scroll position
   */
  private calculateTargetScrollTop = (container: HTMLElement): number => {
    return container.scrollHeight - container.clientHeight;
  };

  /**
   * Scroll container to target position
   */
  private scrollToTarget = (container: HTMLElement, targetScrollTop: number): void => {
    container.scrollTo({
      top: targetScrollTop,
      behavior: 'instant',
    });
    this.lastScrollTop = targetScrollTop;
  };

  /**
   * Handle scroll event to detect manual scrolling
   */
  protected onScroll = (): void => {
    if (!this.messagesContainer?.nativeElement) return;

    this.debounceScroll();
  };

  /**
   * Debounce scroll event processing
   */
  private debounceScroll = (): void => {
    if (this.scrollTimeout) clearTimeout(this.scrollTimeout);
    this.scrollTimeout = setTimeout(() => this.processScroll(), 100);
  };

  /**
   * Process scroll position and update auto-scroll state
   */
  private processScroll = (): void => {
    const container = this.messagesContainer!.nativeElement;
    const scrollTop = container.scrollTop;

    if (this.hasScrollPositionChanged(scrollTop)) {
      this.handleScrollPositionChange(container, scrollTop);
      this.lastScrollTop = scrollTop;
    }
  };

  /**
   * Check if scroll position changed significantly
   */
  private hasScrollPositionChanged = (scrollTop: number): boolean => {
    return Math.abs(scrollTop - this.lastScrollTop) > 5;
  };

  /**
   * Handle scroll position change
   */
  private handleScrollPositionChange = (container: HTMLElement, scrollTop: number): void => {
    const isAtBottom = this.isScrolledToBottom(container, scrollTop);
    const conversationId = this.conversationId();

    if (isAtBottom) {
      this.handleScrolledToBottom(conversationId);
    } else {
      this.chatScrollService.setAutoScroll(conversationId, false);
    }
  };

  /**
   * Check if scrolled to bottom
   */
  private isScrolledToBottom = (container: HTMLElement, scrollTop: number): boolean => {
    const distanceFromBottom = container.scrollHeight - scrollTop - container.clientHeight;
    return distanceFromBottom < 50;
  };

  /**
   * Handle scrolled to bottom - enable auto-scroll and mark read
   */
  private handleScrolledToBottom = (conversationId: string): void => {
    this.chatScrollService.setAutoScroll(conversationId, true);
    const latestMessageId = this.getLatestMessageId();
    if (latestMessageId) {
      this.chatScrollService.markAsRead(conversationId, latestMessageId);
    }
  };

  /**
   * Get the ID of the latest message
   */
  private getLatestMessageId = (): string | null => {
    const groups = this.messageGroups();
    if (groups.length === 0) return null;

    const lastGroup = groups[groups.length - 1];
    if (lastGroup.messages.length === 0) return null;

    const lastMessage = lastGroup.messages[lastGroup.messages.length - 1];
    return lastMessage.id;
  };

  /**
   * Handle message click
   */
  protected onMessageClick = (messageId: string): void => {
    this.messageClicked.emit(messageId);
  };

  /**
   * Handle avatar click
   */
  protected onAvatarClick = (senderId: string): void => {
    this.avatarClicked.emit(senderId);
  };

  /**
   * Handle sender name click
   */
  protected onSenderClick = (senderId: string): void => {
    this.senderClicked.emit(senderId);
  };

  /**
   * Handle reaction click
   */
  protected onReactionClick = (messageId: string, emoji: string): void => {
    this.reactionAdded.emit({ messageId, emoji });
  };

  /**
   * Handle reaction bar button click
   */
  protected onReactionBarClick = (messageId: string, type: ReactionType): void => {
    if (type === 'comment') {
      this.threadClicked.emit(messageId);
    } else if (type === 'add-reaction') {
      // Add-reaction button opens picker in ReactionBar, no need to emit
    } else {
      this.reactionAdded.emit({ messageId, emoji: type });
    }
  };

  /**
   * Handle thread button click
   */
  protected onThreadClick = (messageId: string): void => {
    this.threadClicked.emit(messageId);
  };

  /**
   * Handle edit message request
   */
  protected onEditMessage = (messageId: string): void => {
    this.editingMessageId.set(messageId);
  };

  /**
   * Handle cancel edit
   */
  protected onCancelEdit = (): void => {
    this.editingMessageId.set(null);
  };

  /**
   * Handle save edited message
   */
  protected onSaveEdit = (messageId: string, newContent: string): void => {
    this.messageEdited.emit({ messageId, newContent });
    this.editingMessageId.set(null);
  };

  /**
   * Handle delete message request
   */
  protected onDeleteMessage = (messageId: string): void => {
    this.deleteConfirmationMessageId.set(messageId);
  };

  /**
   * Handle delete confirmation cancel
   */
  protected onCancelDelete = (): void => {
    this.deleteConfirmationMessageId.set(null);
  };

  /**
   * Handle delete confirmation confirm
   */
  protected onConfirmDelete = (): void => {
    const messageId = this.deleteConfirmationMessageId();
    if (messageId) {
      this.messageDeleted.emit(messageId);
      this.deleteConfirmationMessageId.set(null);
    }
  };

  /**
   * Check if message is being edited
   */
  protected isEditing = (messageId: string): boolean => {
    return this.editingMessageId() === messageId;
  };

  /**
   * Handle image load error - use fallback avatar
   */
  protected onImageError = (event: Event): void => {
    const img = event.target as HTMLImageElement;
    img.src = '/img/profile/profile-0.svg';
  };
}
