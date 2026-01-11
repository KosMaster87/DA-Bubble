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
   * @description Monitors message count changes and triggers auto-scroll when appropriate
   * @returns void
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
   * @description Calculates total number of messages across all message groups
   * @returns Total message count
   */
  private getCurrentMessageCount = (): number => {
    const groups = this.messageGroups();
    return groups.reduce((sum, group) => sum + group.messages.length, 0);
  };

  /**
   * Handle message count change (initial load or new messages)
   * @description Determines if this is initial load or new messages and triggers appropriate handling
   * @param conversationId - Unique identifier for the conversation
   * @param currentCount - Current total message count
   * @param autoScrollEnabled - Whether auto-scroll is currently enabled
   * @returns void
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
   * @description Determines if messages are being loaded for the first time
   * @param currentCount - Current total message count
   * @returns True if this is the initial load (previous count was 0)
   */
  private isInitialLoad = (currentCount: number): boolean => {
    return this.lastMessageCount === 0 && currentCount > 0;
  };

  /**
   * Check if should auto-scroll for new messages
   * @description Determines if new messages should trigger auto-scroll based on count change and user preference
   * @param currentCount - Current total message count
   * @param autoScrollEnabled - Whether auto-scroll is currently enabled
   * @returns True if new messages arrived and auto-scroll is enabled
   */
  private shouldAutoScrollForNewMessages = (
    currentCount: number,
    autoScrollEnabled: boolean
  ): boolean => {
    return currentCount > this.lastMessageCount && autoScrollEnabled;
  };

  /**
   * Handle initial load - scroll and mark as read
   * @description Triggers scroll to bottom and marks latest message as read on initial load
   * @param conversationId - Unique identifier for the conversation
   * @returns void
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
   * @description Triggers scroll to bottom and marks latest message as read when new messages arrive
   * @param conversationId - Unique identifier for the conversation
   * @returns void
   */
  private handleNewMessages = (conversationId: string): void => {
    this.shouldScrollToBottom = true;
    const latestMessageId = this.getLatestMessageId();
    if (latestMessageId) {
      this.chatScrollService.markAsRead(conversationId, latestMessageId);
    }
  };

  /**
   * Angular lifecycle hook - runs after view is checked
   * @description Performs pending scroll operations after view updates
   */
  ngAfterViewChecked(): void {
    if (this.shouldScrollToBottom) {
      this.scrollToBottom();
      this.shouldScrollToBottom = false;
    }
  }

  /**
   * Scroll to bottom of messages
   * @description Initiates scroll operation to bottom of message container with validation
   * @returns void
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
   * @description Executes the scroll to bottom with error handling
   * @returns void
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
   * @description Calculates the scroll position needed to reach the bottom of the container
   * @param container - HTML element containing the messages
   * @returns Target scroll position in pixels
   */
  private calculateTargetScrollTop = (container: HTMLElement): number => {
    return container.scrollHeight - container.clientHeight;
  };

  /**
   * Scroll container to target position
   * @description Executes the scroll operation with instant behavior and updates last scroll position
   * @param container - HTML element containing the messages
   * @param targetScrollTop - Target scroll position in pixels
   * @returns void
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
   * @description Event handler triggered on container scroll, initiates debounced processing
   * @returns void
   */
  protected onScroll = (): void => {
    if (!this.messagesContainer?.nativeElement) return;

    this.debounceScroll();
  };

  /**
   * Debounce scroll event processing
   * @description Delays scroll processing by 100ms to avoid excessive calculations
   * @returns void
   */
  private debounceScroll = (): void => {
    if (this.scrollTimeout) clearTimeout(this.scrollTimeout);
    this.scrollTimeout = setTimeout(() => this.processScroll(), 100);
  };

  /**
   * Process scroll position and update auto-scroll state
   * @description Analyzes current scroll position and updates auto-scroll state if position changed significantly
   * @returns void
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
   * @description Compares current scroll position with last known position (threshold: 5px)
   * @param scrollTop - Current scroll position in pixels
   * @returns True if position changed by more than 5 pixels
   */
  private hasScrollPositionChanged = (scrollTop: number): boolean => {
    return Math.abs(scrollTop - this.lastScrollTop) > 5;
  };

  /**
   * Handle scroll position change
   * @description Determines if user scrolled to bottom and updates auto-scroll state accordingly
   * @param container - HTML element containing the messages
   * @param scrollTop - Current scroll position in pixels
   * @returns void
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
   * @description Determines if user is within 50px of the bottom of the container
   * @param container - HTML element containing the messages
   * @param scrollTop - Current scroll position in pixels
   * @returns True if within 50px of bottom
   */
  private isScrolledToBottom = (container: HTMLElement, scrollTop: number): boolean => {
    const distanceFromBottom = container.scrollHeight - scrollTop - container.clientHeight;
    return distanceFromBottom < 50;
  };

  /**
   * Handle scrolled to bottom - enable auto-scroll and mark read
   * @description Enables auto-scroll and marks latest message as read when user reaches bottom
   * @param conversationId - Unique identifier for the conversation
   * @returns void
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
   * @description Retrieves the ID of the most recent message from the last group
   * @returns Message ID or null if no messages exist
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
   * @description Emits message click event with message ID
   * @param messageId - Unique identifier of the clicked message
   * @returns void
   */
  protected onMessageClick = (messageId: string): void => {
    this.messageClicked.emit(messageId);
  };

  /**
   * Handle avatar click
   * @description Emits avatar click event with sender ID and stops event propagation
   * @param senderId - Unique identifier of the message sender
   * @param event - DOM click event
   * @returns void
   */
  protected onAvatarClick = (senderId: string, event: Event): void => {
    event.stopPropagation(); // Prevent message click event from firing
    this.avatarClicked.emit(senderId);
  };

  /**
   * Handle sender name click
   * @description Emits sender click event with sender ID and stops event propagation
   * @param senderId - Unique identifier of the message sender
   * @param event - DOM click event
   * @returns void
   */
  protected onSenderClick = (senderId: string, event: Event): void => {
    event.stopPropagation(); // Prevent message click event from firing
    this.senderClicked.emit(senderId);
  };

  /**
   * Handle reaction click
   * @description Emits reaction added event with message ID and emoji
   * @param messageId - Unique identifier of the message
   * @param emoji - Emoji string to add as reaction
   * @returns void
   */
  protected onReactionClick = (messageId: string, emoji: string): void => {
    this.reactionAdded.emit({ messageId, emoji });
  };

  /**
   * Handle reaction bar button click
   * @description Routes reaction bar clicks to appropriate handlers (thread, add-reaction, or emoji)
   * @param messageId - Unique identifier of the message
   * @param type - Type of reaction bar action (comment, add-reaction, or emoji)
   * @returns void
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
   * @description Emits thread click event with message ID
   * @param messageId - Unique identifier of the message to open thread for
   * @returns void
   */
  protected onThreadClick = (messageId: string): void => {
    this.threadClicked.emit(messageId);
  };

  /**
   * Handle edit message request
   * @description Activates edit mode for the specified message
   * @param messageId - Unique identifier of the message to edit
   * @returns void
   */
  protected onEditMessage = (messageId: string): void => {
    this.editingMessageId.set(messageId);
  };

  /**
   * Handle cancel edit
   * @description Deactivates edit mode without saving changes
   * @returns void
   */
  protected onCancelEdit = (): void => {
    this.editingMessageId.set(null);
  };

  /**
   * Handle save edited message
   * @description Emits message edited event and deactivates edit mode
   * @param messageId - Unique identifier of the edited message
   * @param newContent - Updated message content
   * @returns void
   */
  protected onSaveEdit = (messageId: string, newContent: string): void => {
    this.messageEdited.emit({ messageId, newContent });
    this.editingMessageId.set(null);
  };

  /**
   * Handle delete message request
   * @description Shows delete confirmation modal for the specified message
   * @param messageId - Unique identifier of the message to delete
   * @returns void
   */
  protected onDeleteMessage = (messageId: string): void => {
    this.deleteConfirmationMessageId.set(messageId);
  };

  /**
   * Handle delete confirmation cancel
   * @description Closes delete confirmation modal without deleting
   * @returns void
   */
  protected onCancelDelete = (): void => {
    this.deleteConfirmationMessageId.set(null);
  };

  /**
   * Handle delete confirmation confirm
   * @description Emits message deleted event and closes confirmation modal
   * @returns void
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
   * @description Determines if the specified message is currently in edit mode
   * @param messageId - Unique identifier of the message to check
   * @returns True if message is being edited
   */
  protected isEditing = (messageId: string): boolean => {
    return this.editingMessageId() === messageId;
  };

  /**
   * Handle image load error - use fallback avatar
   * @description Replaces failed avatar image with default fallback image
   * @param event - DOM error event from image element
   * @returns void
   */
  protected onImageError = (event: Event): void => {
    const img = event.target as HTMLImageElement;
    img.src = '/img/profile/profile-0.svg';
  };
}
