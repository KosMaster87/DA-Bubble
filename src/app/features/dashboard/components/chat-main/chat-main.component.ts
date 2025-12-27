/**
 * @fileoverview Chat Main Component
 * @description Main chat interface for conversations
 * @module features/dashboard/components/chat-main
 */

import { Component, signal } from '@angular/core';
import { DatePipe } from '@angular/common';

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
  imports: [DatePipe],
  templateUrl: './chat-main.component.html',
  styleUrl: './chat-main.component.scss',
})
export class ChatMainComponent {
  /**
   * Chat title (channel name or user name)
   */
  protected chatTitle = signal<string>('General Chat');

  /**
   * Chat description
   */
  protected chatDescription = signal<string>('Main conversation area');

  /**
   * Message input value
   */
  protected messageInput = signal<string>('');

  /**
   * Dummy messages
   */
  protected messages = signal<ChatMessage[]>([
    {
      id: '1',
      senderId: '1',
      senderName: 'Sofia Müller',
      senderAvatar: '/img/profile/profile-1.png',
      content: 'Hey everyone! How is the project going?',
      timestamp: new Date('2024-12-27T09:00:00'),
      isOwnMessage: false,
    },
    {
      id: '2',
      senderId: '2',
      senderName: 'You',
      senderAvatar: '/img/profile/profile-2.png',
      content: 'Great! We are making good progress on the dashboard.',
      timestamp: new Date('2024-12-27T09:05:00'),
      isOwnMessage: true,
    },
    {
      id: '3',
      senderId: '3',
      senderName: 'Noah Braun',
      senderAvatar: '/img/profile/profile-3.png',
      content: 'I finished the authentication module yesterday.',
      timestamp: new Date('2024-12-27T09:10:00'),
      isOwnMessage: false,
    },
  ]);

  /**
   * Handle message input change
   */
  onMessageInputChange(event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    this.messageInput.set(value);
  }

  /**
   * Send message
   */
  sendMessage(): void {
    const content = this.messageInput().trim();
    if (!content) return;

    const newMessage: ChatMessage = {
      id: Date.now().toString(),
      senderId: '2',
      senderName: 'You',
      senderAvatar: '/img/profile/profile-2.png',
      content,
      timestamp: new Date(),
      isOwnMessage: true,
    };

    this.messages.update((msgs) => [...msgs, newMessage]);
    this.messageInput.set('');
  }

  /**
   * Handle enter key in input
   */
  onKeyDown(event: KeyboardEvent): void {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      this.sendMessage();
    }
  }
}
