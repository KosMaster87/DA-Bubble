/**
 * @fileoverview Chat Mailbox Component
 * @description Mailbox for receiving messages from contacts, admins, system notifications
 * @module features/dashboard/components/chat-mailbox
 */

import { Component, signal } from '@angular/core';
import { DatePipe } from '@angular/common';

export interface MailboxMessage {
  id: string;
  from: string;
  fromAvatar: string;
  subject: string;
  preview: string;
  timestamp: Date;
  isRead: boolean;
  type: 'user' | 'admin' | 'system';
}

@Component({
  selector: 'app-chat-mailbox',
  imports: [DatePipe],
  templateUrl: './chat-mailbox.component.html',
  styleUrl: './chat-mailbox.component.scss',
})
export class ChatMailboxComponent {
  /**
   * Dummy mailbox messages
   */
  protected messages = signal<MailboxMessage[]>([
    {
      id: '1',
      from: 'System Admin',
      fromAvatar: '/img/profile/profile-1.png',
      subject: 'Welcome to DABubble',
      preview: 'Welcome to DABubble! Here are some tips to get started...',
      timestamp: new Date('2024-12-27T10:00:00'),
      isRead: false,
      type: 'admin',
    },
    {
      id: '2',
      from: 'Sofia Müller',
      fromAvatar: '/img/profile/profile-2.png',
      subject: 'Project Update',
      preview: 'Hey! I wanted to give you an update on the project...',
      timestamp: new Date('2024-12-26T15:30:00'),
      isRead: true,
      type: 'user',
    },
    {
      id: '3',
      from: 'System',
      fromAvatar: '/img/icon/profile/mail-default.svg',
      subject: 'Security Alert',
      preview: 'Your password will expire in 7 days. Please update it...',
      timestamp: new Date('2024-12-25T09:15:00'),
      isRead: false,
      type: 'system',
    },
  ]);

  /**
   * Handle message click
   */
  onMessageClick(messageId: string): void {
    console.log('Message clicked:', messageId);
    // TODO: Open chat window with this message
  }
}
