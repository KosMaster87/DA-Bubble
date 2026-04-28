/**
 * @fileoverview Conversation Messages Component
 * @description Reusable component for displaying grouped messages with date separators
 * @module shared/dashboard-components/conversation-messages
 */

import { DatePipe } from '@angular/common';
import {
  AfterViewChecked,
  Component,
  effect,
  ElementRef,
  inject,
  input,
  output,
  ViewChild,
} from '@angular/core';
import { MessageReaction } from '@core/models/message.model';
import { UserPresenceStore } from '../../../stores';
import {
  ChatScrollService,
  MessageHelperService,
  MessageInteractionService,
  MessageScrollCoordinatorService,
} from '../../services';
import { DeleteMessageModalComponent } from '../delete-message-modal/delete-message-modal.component';
import { MessageContentComponent } from '../message-content/message-content.component';
import { MessageEdit } from '../message-edit/message-edit';
import { ReactionBarComponent, type ReactionType } from '../reaction-bar/reaction-bar.component';
import { ReactionCountingComponent } from '../reaction-counting/reaction-counting.component';

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
    MessageContentComponent,
    DeleteMessageModalComponent,
  ],
  providers: [MessageScrollCoordinatorService, MessageInteractionService, MessageHelperService],
  templateUrl: './conversation-messages.component.html',
  styleUrl: './conversation-messages.component.scss',
})
export class ConversationMessagesComponent implements AfterViewChecked {
  @ViewChild('messagesContainer', { read: ElementRef }) messagesContainer?: ElementRef;

  conversationId = input.required<string>();
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
  mentionClicked = output<string>();
  channelMentionClicked = output<string>();

  private chatScrollService = inject(ChatScrollService);
  private scrollCoordinator = inject(MessageScrollCoordinatorService);
  private interactionService = inject(MessageInteractionService);
  private messageHelper = inject(MessageHelperService);
  protected userPresenceStore = inject(UserPresenceStore);

  protected editingMessageId = this.interactionService.getEditingMessageId();
  protected deleteConfirmationMessageId = this.interactionService.getDeleteConfirmationMessageId();

  /**
   * Constructor - initializes component effects
   * @description Defines a single hydration path so startup and reload behavior remain predictable across navigation scenarios.
   */
  constructor() {
    this.setupMessageChangeEffect();
  }

  /**
   * Setup effect to track message changes and auto-scroll
   * @description Keeps this component focused on UI orchestration while delegating domain logic to dedicated services and stores.
   * Monitors message count changes and triggers auto-scroll when appropriate
   * @returns {void}
   */
  private setupMessageChangeEffect = (): void => {
    effect(() => {
      const currentMessageCount = this.messageHelper.getCurrentMessageCount(this.messageGroups());
      const conversationId = this.conversationId();
      const autoScrollEnabled = this.chatScrollService.getAutoScroll(conversationId);

      if (currentMessageCount !== this.scrollCoordinator.getLastMessageCount()) {
        this.handleMessageCountChange(conversationId, currentMessageCount, autoScrollEnabled);
      }
      this.scrollCoordinator.updateLastMessageCount(currentMessageCount);
    });
  };

  /**
   * Handle message count change (initial load or new messages)
   * @description Defines a single hydration path so startup and reload behavior remain predictable across navigation scenarios.
   * Determines if this is initial load or new messages and triggers appropriate handling
   * @param {string} conversationId - Unique identifier for the conversation
   * @param {number} currentCount - Current total message count
   * @param {boolean} autoScrollEnabled - Whether auto-scroll is currently enabled
   * @returns {void}
   */
  private handleMessageCountChange = (
    conversationId: string,
    currentCount: number,
    autoScrollEnabled: boolean,
  ): void => {
    const result = this.scrollCoordinator.handleMessageCountChange(
      conversationId,
      currentCount,
      autoScrollEnabled,
    );

    if (result.shouldScroll) {
      const latestMessageId = this.messageHelper.getLatestMessageId(this.messageGroups());
      if (latestMessageId) {
        this.chatScrollService.enterConversation(conversationId, latestMessageId);
      }
    }
  };

  /**
   * Angular lifecycle hook - runs after view is checked
   * @description Executes deferred scroll/read updates after DOM rendering has stabilized.
   * Performs pending scroll operations after view updates
   * @returns {void}
   */
  ngAfterViewChecked(): void {
    if (this.scrollCoordinator.shouldScroll()) {
      this.scrollCoordinator.scrollToBottom(this.messagesContainer);
      this.scrollCoordinator.resetScrollFlag();
    }
  }

  /**
   * Handle scroll event to detect manual scrolling
   * @description Keeps this component focused on UI orchestration while delegating domain logic to dedicated services and stores.
   * Event handler triggered on container scroll, initiates debounced processing
   * @returns {void}
   */
  protected onScroll = (): void => {
    if (!this.messagesContainer?.nativeElement) return;

    this.scrollCoordinator.debounceScroll(() => {
      this.scrollCoordinator.processScroll(this.messagesContainer, this.conversationId());
      this.updateReadStatus();
    });
  };

  /**
   * Update read status if scrolled to bottom
   * @description Marks the latest visible message as read when auto-scroll indicates the user is at the bottom.
   * @returns {void}
   */
  private updateReadStatus = (): void => {
    const conversationId = this.conversationId();
    const latestMessageId = this.messageHelper.getLatestMessageId(this.messageGroups());
    if (latestMessageId && this.chatScrollService.getAutoScroll(conversationId)) {
      this.chatScrollService.markAsRead(conversationId, latestMessageId);
    }
  };

  /**
   * Handle message click
   * @description Keeps this component focused on UI orchestration while delegating domain logic to dedicated services and stores.
   * Emits message click event with message ID
   * @param {string} messageId - Unique identifier of the clicked message
   * @returns {void}
   */
  protected onMessageClick = (messageId: string): void => {
    this.messageClicked.emit(messageId);
  };

  /**
   * Handle avatar click
   * @description Keeps this component focused on UI orchestration while delegating domain logic to dedicated services and stores.
   * Emits avatar click event with sender ID and stops event propagation
   * @param {string} senderId - Unique identifier of the message sender
   * @param {Event} event - DOM click event
   * @returns {void}
   */
  protected onAvatarClick = (senderId: string, event: Event): void => {
    event.stopPropagation(); // Prevent message click event from firing
    this.avatarClicked.emit(senderId);
  };

  /**
   * Handle sender name click
   * @description Keeps this component focused on UI orchestration while delegating domain logic to dedicated services and stores.
   * Emits sender click event with sender ID and stops event propagation
   * @param {string} senderId - Unique identifier of the message sender
   * @param {Event} event - DOM click event
   * @returns {void}
   */
  protected onSenderClick = (senderId: string, event: Event): void => {
    event.stopPropagation(); // Prevent message click event from firing
    this.senderClicked.emit(senderId);
  };

  /**
   * Handle reaction click
   * @description Keeps this component focused on UI orchestration while delegating domain logic to dedicated services and stores.
   * Emits reaction added event with message ID and emoji
   * @param {string} messageId - Unique identifier of the message
   * @param {string} emoji - Emoji string to add as reaction
   * @returns {void}
   */
  protected onReactionClick = (messageId: string, emoji: string): void => {
    this.reactionAdded.emit({ messageId, emoji });
  };

  /**
   * Handle reaction bar button click
   * @description Keeps this component focused on UI orchestration while delegating domain logic to dedicated services and stores.
   * Routes reaction bar clicks to appropriate handlers (thread, add-reaction, or emoji)
   * @param {string} messageId - Unique identifier of the message
   * @param {ReactionType} type - Type of reaction bar action (comment, add-reaction, or emoji)
   * @returns {void}
   */
  protected onReactionBarClick = (messageId: string, type: ReactionType): void => {
    if (type === 'comment') {
      this.threadClicked.emit(messageId);
    } else if (type !== 'add-reaction') {
      this.reactionAdded.emit({ messageId, emoji: type });
    }
  };

  /**
   * Handle thread button click
   * @description Keeps this component focused on UI orchestration while delegating domain logic to dedicated services and stores.
   * Emits thread click event with message ID
   * @param {string} messageId - Unique identifier of the message to open thread for
   * @returns {void}
   */
  protected onThreadClick = (messageId: string): void => {
    this.threadClicked.emit(messageId);
  };

  /**
   * Handle edit message request
   * @description Enters edit mode for the targeted message via the interaction state service.
   * Activates edit mode for the specified message
   * @param {string} messageId - Unique identifier of the message to edit
   * @returns {void}
   */
  protected onEditMessage = (messageId: string): void => {
    this.interactionService.startEdit(messageId);
  };

  /**
   * Handle cancel edit
   * @description Exits edit mode without emitting update events so the original message content remains unchanged.
   * Deactivates edit mode without saving changes
   * @returns {void}
   */
  protected onCancelEdit = (): void => {
    this.interactionService.cancelEdit();
  };

  /**
   * Handle save edited message
   * @description Emits the edited payload and clears edit mode to return the row to normal display state.
   * Emits message edited event and deactivates edit mode
   * @param {string} messageId - Unique identifier of the edited message
   * @param {string} newContent - Updated message content
   * @returns {void}
   */
  protected onSaveEdit = (messageId: string, newContent: string): void => {
    this.messageEdited.emit({ messageId, newContent });
    this.interactionService.completeEdit();
  };

  /**
   * Handle delete message request
   * @description Marks the selected message for delete confirmation before destructive action is executed.
   * Shows delete confirmation modal for the specified message
   * @param {string} messageId - Unique identifier of the message to delete
   * @returns {void}
   */
  protected onDeleteMessage = (messageId: string): void => {
    this.interactionService.showDeleteConfirmation(messageId);
  };

  /**
   * Handle delete confirmation cancel
   * @description Clears pending delete state so confirmation UI closes without side effects.
   * Closes delete confirmation modal without deleting
   * @returns {void}
   */
  protected onCancelDelete = (): void => {
    this.interactionService.cancelDelete();
  };

  /**
   * Handle delete confirmation confirm
   * @description Emits deletion for the pending message and then clears delete-confirmation state.
   * Emits message deleted event and closes confirmation modal
   * @returns {void}
   */
  protected onConfirmDelete = (): void => {
    const messageId = this.interactionService.getDeleteMessageId();
    if (messageId) {
      this.messageDeleted.emit(messageId);
      this.interactionService.completeDeletion();
    }
  };

  /**
   * Check if message is being edited
   * @description Resolves whether a given message ID matches the current edit target for conditional template rendering.
   * Determines if the specified message is currently in edit mode
   * @param {string} messageId - Unique identifier of the message to check
   * @returns {boolean} True if message is being edited
   */
  protected isEditing = (messageId: string): boolean => {
    return this.interactionService.isEditing(messageId);
  };

  /**
   * Handle image load error - use fallback avatar
   * @description Replaces broken avatar URLs with the default profile image to keep message rows visually stable.
   * Replaces failed avatar image with default fallback image
   * @param {Event} event - DOM error event from image element
   * @returns {void}
   */
  protected onImageError = (event: Event): void => {
    const img = event.target as HTMLImageElement;
    img.src = '/img/profile/profile-0.svg';
  };
}
