/**
 * @fileoverview Chat Channel Component
 * @description Chat interface for specific channels
 * @module features/dashboard/components/chat-channel
 */

import { Component, signal, input } from '@angular/core';
import { DatePipe } from '@angular/common';

export interface ChannelMessage {
  id: string;
  senderId: string;
  senderName: string;
  senderAvatar: string;
  content: string;
  timestamp: Date;
  isOwnMessage: boolean;
  reactions?: { emoji: string; count: number }[];
}

export interface ChannelInfo {
  id: string;
  name: string;
  description: string;
  memberCount: number;
}

@Component({
  selector: 'app-chat-channel',
  imports: [DatePipe],
  templateUrl: './chat-channel.component.html',
  styleUrl: './chat-channel.component.scss',
})
export class ChatChannelComponent {
  /**
   * Channel information
   */
  channel = input<ChannelInfo>({
    id: '1',
    name: 'Entwicklung',
    description: 'Development team channel',
    memberCount: 5,
  });

  /**
   * Message input value
   */
  protected messageInput = signal<string>('');

  /**
   * Dummy channel messages
   */
  protected messages = signal<ChannelMessage[]>([
    {
      id: '1',
      senderId: '1',
      senderName: 'Sofia Müller',
      senderAvatar: '/img/profile/profile-1.png',
      content: 'Welcome to the #Entwicklung channel!',
      timestamp: new Date('2024-12-27T08:00:00'),
      isOwnMessage: false,
      reactions: [
        { emoji: '👍', count: 3 },
        { emoji: '🎉', count: 2 },
      ],
    },
    {
      id: '2',
      senderId: '2',
      senderName: 'You',
      senderAvatar: '/img/profile/profile-2.png',
      content: 'Thanks! Happy to be here.',
      timestamp: new Date('2024-12-27T08:05:00'),
      isOwnMessage: true,
    },
    {
      id: '3',
      senderId: '3',
      senderName: 'Noah Braun',
      senderAvatar: '/img/profile/profile-3.png',
      content: "Let's discuss the new feature requirements for the project.",
      timestamp: new Date('2024-12-27T08:15:00'),
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
   * Send message to channel
   */
  sendMessage(): void {
    const content = this.messageInput().trim();
    if (!content) return;

    const newMessage: ChannelMessage = {
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

  /**
   * Add reaction to message
   */
  addReaction(messageId: string, emoji: string): void {
    console.log('Add reaction:', messageId, emoji);
    // TODO: Implement reaction functionality
  }

  /**
   * View channel members
   */
  viewMembers(): void {
    console.log('View members');
    // TODO: Open members list
  }

  /**
   * View channel details
   */
  viewChannelDetails(): void {
    console.log('View channel details');
    // TODO: Open channel details
  }
}
