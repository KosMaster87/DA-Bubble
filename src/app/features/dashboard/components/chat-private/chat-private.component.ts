/**
 * @fileoverview Chat Private Component
 * @description Private 1-on-1 chat conversations
 * @module features/dashboard/components/chat-private
 */

import { Component, signal, input, inject, computed, output } from '@angular/core';
import { DummyChatDmService } from '../../services/dummy-chat-dm.service';
import { DummyUsersService } from '../../services/dummy-users.service';
import { DummyThreadService } from '../../services/dummy-thread.service';
import { CurrentUserService } from '../../services/current-user.service';
import { MessageBoxComponent } from '@shared/dashboard-components/message-box/message-box.component';
import {
  ConversationMessagesComponent,
  type Message,
  type MessageGroup,
} from '@shared/dashboard-components/conversation-messages/conversation-messages.component';

export interface DMInfo {
  conversationId: string;
  userName: string;
  userAvatar: string;
  isOnline: boolean;
}

@Component({
  selector: 'app-chat-private',
  imports: [MessageBoxComponent, ConversationMessagesComponent],
  templateUrl: './chat-private.component.html',
  styleUrl: './chat-private.component.scss',
})
export class ChatPrivateComponent {
  protected chatDmService = inject(DummyChatDmService);
  protected usersService = inject(DummyUsersService);
  protected currentUserService = inject(CurrentUserService);
  protected threadService = inject(DummyThreadService);
  protected userName = computed(() => this.dmInfo().userName);
  protected userStatus = computed(() => (this.dmInfo().isOnline ? 'Online' : 'Offline'));
  dmInfo = input.required<DMInfo>();
  threadRequested = output<{ messageId: string; parentMessage: Message }>();

  /**
   * Messages from service
   */
  protected messages = computed<Message[]>(() => {
    const conversationMessages = this.chatDmService.getMessagesForConversation(
      this.dmInfo().conversationId
    );
    const currentUserId = this.currentUserService.currentUserId();

    return conversationMessages.map((msg) => ({
      id: msg.id,
      senderId: msg.senderId,
      senderName: msg.senderName,
      senderAvatar: msg.senderAvatar,
      content: msg.content,
      timestamp: msg.timestamp,
      isOwnMessage: msg.senderId === currentUserId,
    }));
  });

  /**
   * Group messages by date
   */
  protected messagesGroupedByDate = computed<MessageGroup[]>(() => {
    const messages = this.messages();
    const groups = new Map<string, Message[]>();

    messages.forEach((message) => {
      const dateKey = this.getDateKey(message.timestamp);
      if (!groups.has(dateKey)) {
        groups.set(dateKey, []);
      }

      // Add thread info to message
      const threadCount = this.threadService.getThreadCount(message.id);
      const lastThreadTimestamp = this.threadService.getLastReplyTimestamp(message.id);

      groups.get(dateKey)!.push({
        ...message,
        threadCount: threadCount > 0 ? threadCount : undefined,
        lastThreadTimestamp: lastThreadTimestamp || undefined,
      });
    });

    return Array.from(groups.entries()).map(([dateKey, msgs]) => ({
      date: msgs[0].timestamp,
      label: this.getDateLabel(msgs[0].timestamp),
      messages: msgs,
    }));
  });

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
   * Send message
   */
  sendMessage(content: string): void {
    if (!content.trim()) return;

    const currentUserId = this.currentUserService.currentUserId();
    const currentUser = this.usersService.getUserById(currentUserId);

    if (currentUser) {
      this.chatDmService.sendMessage(
        this.dmInfo().conversationId,
        currentUserId,
        currentUser.name,
        currentUser.avatar,
        content.trim()
      );
    }
  }

  /**
   * Handle message click
   */
  onMessageClick(messageId: string): void {
    console.log('Message clicked:', messageId);
    // TODO: Implement message actions (edit, delete, etc.)
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

  /**
   * Handle thread click
   */
  onThreadClick(messageId: string): void {
    // Find the parent message
    const parentMessage = this.messages().find((m) => m.id === messageId);
    if (parentMessage) {
      this.threadRequested.emit({ messageId, parentMessage });
    }
  }
}
