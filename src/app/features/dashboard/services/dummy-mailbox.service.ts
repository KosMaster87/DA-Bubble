/**
 * @fileoverview Dummy Mailbox Service
 * @description Service for managing dummy mailbox messages with localStorage persistence
 * @module features/dashboard/services/dummy-mailbox
 */

import { Injectable, signal, computed } from '@angular/core';

export interface DummyMailboxMessage {
  id: string;
  from: string;
  fromAvatar: string;
  subject: string;
  preview: string;
  fullContent: string;
  timestamp: Date;
  isRead: boolean;
  type: 'user' | 'admin' | 'system';
}

const STORAGE_KEY = 'dabubble_dummy_mailbox';

@Injectable({
  providedIn: 'root',
})
export class DummyMailboxService {
  private messagesSignal = signal<DummyMailboxMessage[]>([]);
  messages = computed(() => this.messagesSignal());
  unreadCount = computed(() => this.messagesSignal().filter((m) => !m.isRead).length);
  adminMessages = computed(() => this.messagesSignal().filter((m) => m.type === 'admin'));
  systemMessages = computed(() => this.messagesSignal().filter((m) => m.type === 'system'));
  userMessages = computed(() => this.messagesSignal().filter((m) => m.type === 'user'));

  constructor() {
    this.loadFromStorage();
  }

  /**
   * Load messages from localStorage
   */
  private loadFromStorage(): void {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        const messages = JSON.parse(stored, (key, value) => {
          if (key === 'timestamp') return new Date(value);
          return value;
        });
        this.messagesSignal.set(messages);
      } catch (error) {
        console.error('Error loading mailbox from storage:', error);
        this.setInitialData();
      }
    } else {
      this.setInitialData();
    }
  }

  /**
   * Save messages to localStorage
   */
  private saveToStorage(): void {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(this.messagesSignal()));
  }

  /**
   * Set initial dummy data
   */
  private setInitialData(): void {
    const initialMessages: DummyMailboxMessage[] = [
      {
        id: '1',
        from: 'System Admin',
        fromAvatar: '/img/profile/profile-1.png',
        subject: 'Welcome to DABubble',
        preview: 'Welcome to DABubble! Here are some tips to get started...',
        fullContent:
          'Welcome to DABubble!\n\nWe are excited to have you here. Here are some tips to get started:\n\n1. Set up your profile\n2. Join channels relevant to your team\n3. Start messaging your colleagues\n4. Customize your notifications\n\nIf you need any help, feel free to reach out to our support team.',
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
        fullContent:
          'Hey!\n\nI wanted to give you an update on the project. We have made significant progress this week:\n\n- Completed the user authentication module\n- Designed the new dashboard layout\n- Fixed critical bugs in the messaging system\n\nLet me know if you have any questions!\n\nBest regards,\nSofia',
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
        fullContent:
          'Security Alert\n\nYour password will expire in 7 days.\n\nFor security reasons, we require you to update your password regularly. Please change your password before it expires to maintain access to your account.\n\nTo change your password, go to Settings > Security > Change Password.\n\nThank you for keeping your account secure.',
        timestamp: new Date('2024-12-25T09:15:00'),
        isRead: false,
        type: 'system',
      },
    ];

    this.messagesSignal.set(initialMessages);
    this.saveToStorage();
  }

  /**
   * Get message by ID
   */
  getMessageById(id: string): DummyMailboxMessage | undefined {
    return this.messagesSignal().find((m) => m.id === id);
  }

  /**
   * Add new message
   */
  addMessage(message: Omit<DummyMailboxMessage, 'id'>): DummyMailboxMessage {
    const newMessage: DummyMailboxMessage = {
      ...message,
      id: `msg-${Date.now()}`,
    };

    this.messagesSignal.update((messages) => [newMessage, ...messages]);
    this.saveToStorage();
    return newMessage;
  }

  /**
   * Mark message as read
   */
  markAsRead(id: string): void {
    this.messagesSignal.update((messages) =>
      messages.map((msg) => (msg.id === id ? { ...msg, isRead: true } : msg))
    );
    this.saveToStorage();
  }

  /**
   * Mark message as unread
   */
  markAsUnread(id: string): void {
    this.messagesSignal.update((messages) =>
      messages.map((msg) => (msg.id === id ? { ...msg, isRead: false } : msg))
    );
    this.saveToStorage();
  }

  /**
   * Mark all messages as read
   */
  markAllAsRead(): void {
    this.messagesSignal.update((messages) => messages.map((msg) => ({ ...msg, isRead: true })));
    this.saveToStorage();
  }

  /**
   * Delete message
   */
  deleteMessage(id: string): void {
    this.messagesSignal.update((messages) => messages.filter((msg) => msg.id !== id));
    this.saveToStorage();
  }

  /**
   * Clear all messages
   */
  clearAll(): void {
    this.messagesSignal.set([]);
    this.saveToStorage();
  }

  /**
   * Reset to initial data
   */
  reset(): void {
    this.setInitialData();
  }
}
