/**
 * @fileoverview Chat Main Component
 * @description Main chat interface for conversations
 * @module features/dashboard/components/chat-main
 */

import { Component, signal, input, inject, computed, effect } from '@angular/core';
import { DatePipe } from '@angular/common';
import { DummyChatDmService } from '../../services/dummy-chat-dm.service';
import { MessageBoxComponent } from '@shared/dashboard-components/message-box/message-box.component';

export interface ChatMessage {
  id: string;
  senderId: string;
  senderName: string;
  senderAvatar: string;
  content: string;
  timestamp: Date;
  isOwnMessage: boolean;
}

@Component({
  selector: 'app-chat-main',
  imports: [DatePipe, MessageBoxComponent],
  templateUrl: './chat-main.component.html',
  styleUrl: './chat-main.component.scss',
})
export class ChatMainComponent {
  protected chatDmService = inject(DummyChatDmService);

  /**
   * Conversation ID input
   */
  conversationId = input.required<string>();

  /**
   * Chat title (user name from conversation)
   */
  protected chatTitle = computed(() => {
    const dm = this.chatDmService.directMessages().find((d) => d.id === this.conversationId());
    return dm?.userName || 'Direct Message';
  });

  /**
   * Chat description
   */
  protected chatDescription = computed(() => {
    const dm = this.chatDmService.directMessages().find((d) => d.id === this.conversationId());
    return dm?.isOnline ? 'Online' : 'Offline';
  });

  /**
   * Messages from service for this conversation
   */
  protected messages = computed<ChatMessage[]>(() => {
    const conversationMessages = this.chatDmService.getMessagesForConversation(
      this.conversationId()
    );
    // Assuming current user ID is '2' (You)
    const currentUserId = '2';

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
   * Send message
   */
  sendMessage(content: string): void {
    if (!content.trim()) return;

    // Get current user info (hardcoded for now, should come from auth service)
    const currentUserId = '2';
    const currentUserName = 'You';
    const currentUserAvatar = '/img/profile/profile-2.png';

    this.chatDmService.sendMessage(
      this.conversationId(),
      currentUserId,
      currentUserName,
      currentUserAvatar,
      content.trim()
    );
  }
}
