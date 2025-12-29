/**
 * @fileoverview Thread Component
 * @description Thread conversations for replying to specific messages in channels and private conversations
 * @module features/dashboard/components/thread
 */

import { Component, signal, input, output, computed, inject, effect } from '@angular/core';
import { DatePipe } from '@angular/common';
import { MessageBoxComponent } from '@shared/dashboard-components/message-box/message-box.component';
import {
  ConversationMessagesComponent,
  type Message,
  type MessageGroup,
} from '@shared/dashboard-components/conversation-messages/conversation-messages.component';
import { DummyThreadService } from '../../services/dummy-thread.service';
import { CurrentUserService } from '../../services/current-user.service';

export interface ThreadInfo {
  parentMessageId: string;
  channelName: string;
  parentMessage?: Message;
}

@Component({
  selector: 'app-thread',
  imports: [DatePipe, MessageBoxComponent, ConversationMessagesComponent],
  templateUrl: './thread.component.html',
  styleUrl: './thread.component.scss',
})
export class ThreadComponent {
  private threadService = inject(DummyThreadService);
  private currentUserService = inject(CurrentUserService);

  threadInfo = input.required<ThreadInfo>();
  closeRequested = output<void>();

  /**
   * Thread replies loaded from service
   */
  protected replies = signal<Message[]>([]);

  constructor() {
    // Load replies when threadInfo changes
    effect(() => {
      const info = this.threadInfo();
      if (info?.parentMessageId) {
        this.loadReplies(info.parentMessageId);
      }
    });
  }

  /**
   * Load replies for the parent message
   */
  private loadReplies(parentMessageId: string): void {
    const threadReplies = this.threadService.getRepliesForMessage(parentMessageId);
    const currentUserId = this.currentUserService.currentUserId();

    // Convert ThreadReply to Message format
    const messages: Message[] = threadReplies.map((reply) => ({
      id: reply.id,
      senderId: reply.senderId,
      senderName: reply.senderName,
      senderAvatar: reply.senderAvatar,
      content: reply.content,
      timestamp: reply.timestamp,
      isOwnMessage: reply.senderId === currentUserId,
    }));

    this.replies.set(messages);
  }

  /**
   * Group replies by date
   */
  protected repliesGroupedByDate = computed<MessageGroup[]>(() => {
    const messages = this.replies();
    const groups = new Map<string, Message[]>();

    messages.forEach((message) => {
      const dateKey = this.getDateKey(message.timestamp);
      if (!groups.has(dateKey)) {
        groups.set(dateKey, []);
      }
      groups.get(dateKey)!.push(message);
    });

    return Array.from(groups.entries()).map(([dateKey, msgs]) => ({
      date: msgs[0].timestamp,
      label: this.getDateLabel(msgs[0].timestamp),
      messages: msgs,
    }));
  });

  /**
   * Total reply count
   */
  protected replyCount = computed(() => this.replies().length);

  /**
   * Get date key for grouping (YYYY-MM-DD)
   */
  private getDateKey(date: Date): string {
    const d = new Date(date);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(
      d.getDate()
    ).padStart(2, '0')}`;
  }

  /**
   * Get date label ("Starting today" or formatted date)
   */
  private getDateLabel(date: Date): string {
    const today = new Date();
    const messageDate = new Date(date);

    // Check if same day
    if (
      today.getFullYear() === messageDate.getFullYear() &&
      today.getMonth() === messageDate.getMonth() &&
      today.getDate() === messageDate.getDate()
    ) {
      return 'Starting today';
    }

    // Format date: "Monday, 28 December"
    return new Intl.DateTimeFormat('en-US', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
    }).format(messageDate);
  }

  /**
   * Handle close button click
   */
  onClose(): void {
    this.closeRequested.emit();
  }

  /**
   * Send reply
   */
  sendReply(content: string): void {
    if (!content.trim()) return;

    const currentUserId = this.currentUserService.currentUserId();
    const currentUser = { id: currentUserId, name: 'Du', avatar: '/img/profile/profile-2.png' };

    // Add reply via service
    const newReply = this.threadService.addReply(
      this.threadInfo().parentMessageId,
      currentUser.id,
      currentUser.name,
      currentUser.avatar,
      content.trim()
    );

    // Reload replies to update UI
    this.loadReplies(this.threadInfo().parentMessageId);
  }

  /**
   * Handle message click
   */
  onMessageClick(messageId: string): void {
    console.log('Thread message clicked:', messageId);
    // TODO: Implement message actions
  }

  /**
   * Handle avatar click
   */
  onAvatarClick(senderId: string): void {
    console.log('Avatar clicked:', senderId);
    // TODO: Open user profile
  }

  /**
   * Handle reaction added
   */
  onReactionAdded(data: { messageId: string; emoji: string }): void {
    console.log('Reaction added:', data);
    // TODO: Implement reaction logic
  }
}
