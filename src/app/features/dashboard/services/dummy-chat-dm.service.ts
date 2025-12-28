/**
 * @fileoverview Dummy Chat DM Service
 * @description Service for managing dummy direct message data with localStorage persistence
 * @module features/dashboard/services/dummy-chat-dm
 */

import { Injectable, signal, computed } from '@angular/core';

export interface DummyDirectMessage {
  id: string;
  userId: string;
  userName: string;
  userAvatar: string;
  isOnline: boolean;
  lastMessage?: string;
  lastMessageTime?: Date;
  unreadCount: number;
}

export interface DummyDMMessage {
  id: string;
  conversationId: string;
  senderId: string;
  senderName: string;
  senderAvatar: string;
  content: string;
  timestamp: Date;
  isRead: boolean;
}

const STORAGE_KEY_DM = 'dabubble_dummy_direct_messages';
const STORAGE_KEY_MESSAGES = 'dabubble_dummy_dm_messages';

@Injectable({
  providedIn: 'root',
})
export class DummyChatDmService {
  private directMessagesSignal = signal<DummyDirectMessage[]>([]);
  private messagesSignal = signal<DummyDMMessage[]>([]);

  directMessages = computed(() => this.directMessagesSignal());
  messages = computed(() => this.messagesSignal());
  totalUnreadCount = computed(() =>
    this.directMessagesSignal().reduce((sum, dm) => sum + dm.unreadCount, 0)
  );

  constructor() {
    this.loadFromStorage();
  }

  /**
   * Load data from localStorage
   */
  private loadFromStorage(): void {
    // Load direct messages
    const storedDM = localStorage.getItem(STORAGE_KEY_DM);
    if (storedDM) {
      try {
        const dms = JSON.parse(storedDM, (key, value) => {
          if (key === 'lastMessageTime') return value ? new Date(value) : undefined;
          return value;
        });
        this.directMessagesSignal.set(dms);
      } catch (error) {
        console.error('Error loading DMs from storage:', error);
        this.setInitialDMData();
      }
    } else {
      this.setInitialDMData();
    }

    // Load messages
    const storedMessages = localStorage.getItem(STORAGE_KEY_MESSAGES);
    if (storedMessages) {
      try {
        const messages = JSON.parse(storedMessages, (key, value) => {
          if (key === 'timestamp') return new Date(value);
          return value;
        });
        this.messagesSignal.set(messages);
      } catch (error) {
        console.error('Error loading messages from storage:', error);
        this.setInitialMessagesData();
      }
    } else {
      this.setInitialMessagesData();
    }
  }

  /**
   * Save to localStorage
   */
  private saveToStorage(): void {
    localStorage.setItem(STORAGE_KEY_DM, JSON.stringify(this.directMessagesSignal()));
    localStorage.setItem(STORAGE_KEY_MESSAGES, JSON.stringify(this.messagesSignal()));
  }

  /**
   * Set initial direct messages data
   */
  private setInitialDMData(): void {
    const initialDMs: DummyDirectMessage[] = [
      {
        id: 'dm-1',
        userId: '1',
        userName: 'Sofia Müller',
        userAvatar: '/img/profile/profile-1.png',
        isOnline: true,
        lastMessage: 'Hey! How is the project going?',
        lastMessageTime: new Date('2024-12-27T09:00:00'),
        unreadCount: 2,
      },
      {
        id: 'dm-2',
        userId: '2',
        userName: 'Noah Braun',
        userAvatar: '/img/profile/profile-2.png',
        isOnline: false,
        lastMessage: 'I finished the authentication module.',
        lastMessageTime: new Date('2024-12-26T15:30:00'),
        unreadCount: 0,
      },
      {
        id: 'dm-3',
        userId: '3',
        userName: 'Eva Schmidt',
        userAvatar: '/img/profile/profile-3.png',
        isOnline: false,
        lastMessage: 'Can we schedule a meeting?',
        lastMessageTime: new Date('2024-12-25T11:20:00'),
        unreadCount: 1,
      },
      {
        id: 'dm-4',
        userId: '4',
        userName: 'Lukas Fischer',
        userAvatar: '/img/profile/profile-4.png',
        isOnline: true,
        unreadCount: 0,
      },
      {
        id: 'dm-5',
        userId: '5',
        userName: 'Mia Wagner',
        userAvatar: '/img/profile/profile-1.png',
        isOnline: true,
        unreadCount: 0,
      },
      {
        id: 'dm-6',
        userId: '6',
        userName: 'Finn Weber',
        userAvatar: '/img/profile/profile-2.png',
        isOnline: false,
        unreadCount: 0,
      },
      {
        id: 'dm-7',
        userId: '7',
        userName: 'Konstantin Neumann',
        userAvatar: '/img/profile/profile-3.png',
        isOnline: false,
        unreadCount: 0,
      },
      {
        id: 'dm-8',
        userId: '8',
        userName: 'Anna Hoffmann',
        userAvatar: '/img/profile/profile-4.png',
        isOnline: true,
        unreadCount: 0,
      },
      {
        id: 'dm-9',
        userId: '9',
        userName: 'Eva Schmidt',
        userAvatar: '/img/profile/profile-3.png',
        isOnline: false,
        lastMessage: 'Can we schedule a meeting?',
        lastMessageTime: new Date('2024-12-25T11:20:00'),
        unreadCount: 1,
      },
      {
        id: 'dm-10',
        userId: '10',
        userName: 'Lukas Fischer',
        userAvatar: '/img/profile/profile-4.png',
        isOnline: true,
        unreadCount: 0,
      },
      {
        id: 'dm-11',
        userId: '11',
        userName: 'Mia Wagner',
        userAvatar: '/img/profile/profile-1.png',
        isOnline: true,
        unreadCount: 0,
      },
      {
        id: 'dm-12',
        userId: '12',
        userName: 'Finn Weber',
        userAvatar: '/img/profile/profile-2.png',
        isOnline: false,
        unreadCount: 0,
      },
      {
        id: 'dm-13',
        userId: '13',
        userName: 'Konstantin Neumann',
        userAvatar: '/img/profile/profile-3.png',
        isOnline: false,
        unreadCount: 0,
      },
      {
        id: 'dm-14',
        userId: '14',
        userName: 'Anna Hoffmann',
        userAvatar: '/img/profile/profile-4.png',
        isOnline: true,
        unreadCount: 0,
      },
    ];

    this.directMessagesSignal.set(initialDMs);
    localStorage.setItem(STORAGE_KEY_DM, JSON.stringify(initialDMs));
  }

  /**
   * Set initial messages data
   */
  private setInitialMessagesData(): void {
    const initialMessages: DummyDMMessage[] = [
      {
        id: 'msg-1',
        conversationId: 'dm-1',
        senderId: '1',
        senderName: 'Sofia Müller',
        senderAvatar: '/img/profile/profile-1.png',
        content: 'Hey! How is the project going?',
        timestamp: new Date('2024-12-27T09:00:00'),
        isRead: false,
      },
      {
        id: 'msg-2',
        conversationId: 'dm-2',
        senderId: '2',
        senderName: 'Noah Braun',
        senderAvatar: '/img/profile/profile-2.png',
        content: 'I finished the authentication module.',
        timestamp: new Date('2024-12-26T15:30:00'),
        isRead: true,
      },
    ];

    this.messagesSignal.set(initialMessages);
    localStorage.setItem(STORAGE_KEY_MESSAGES, JSON.stringify(initialMessages));
  }

  /**
   * Get DM conversation by user ID
   */
  getDMByUserId(userId: string): DummyDirectMessage | undefined {
    return this.directMessagesSignal().find((dm) => dm.userId === userId);
  }

  /**
   * Get messages for conversation
   */
  getMessagesForConversation(conversationId: string): DummyDMMessage[] {
    return this.messagesSignal().filter((msg) => msg.conversationId === conversationId);
  }

  /**
   * Send message
   */
  sendMessage(
    conversationId: string,
    senderId: string,
    senderName: string,
    senderAvatar: string,
    content: string
  ): DummyDMMessage {
    const newMessage: DummyDMMessage = {
      id: `msg-${Date.now()}`,
      conversationId,
      senderId,
      senderName,
      senderAvatar,
      content,
      timestamp: new Date(),
      isRead: false,
    };

    this.messagesSignal.update((messages) => [...messages, newMessage]);

    // Update DM last message
    this.directMessagesSignal.update((dms) =>
      dms.map((dm) =>
        dm.id === conversationId
          ? {
              ...dm,
              lastMessage: content,
              lastMessageTime: newMessage.timestamp,
            }
          : dm
      )
    );

    this.saveToStorage();
    return newMessage;
  }

  /**
   * Mark conversation as read
   */
  markConversationAsRead(conversationId: string): void {
    this.directMessagesSignal.update((dms) =>
      dms.map((dm) => (dm.id === conversationId ? { ...dm, unreadCount: 0 } : dm))
    );

    this.messagesSignal.update((messages) =>
      messages.map((msg) =>
        msg.conversationId === conversationId ? { ...msg, isRead: true } : msg
      )
    );

    this.saveToStorage();
  }

  /**
   * Increment unread count
   */
  incrementUnreadCount(conversationId: string): void {
    this.directMessagesSignal.update((dms) =>
      dms.map((dm) => (dm.id === conversationId ? { ...dm, unreadCount: dm.unreadCount + 1 } : dm))
    );
    this.saveToStorage();
  }

  /**
   * Create new DM conversation
   */
  createDMConversation(
    userId: string,
    userName: string,
    userAvatar: string,
    isOnline: boolean
  ): DummyDirectMessage {
    const existing = this.getDMByUserId(userId);
    if (existing) return existing;

    const newDM: DummyDirectMessage = {
      id: `dm-${Date.now()}`,
      userId,
      userName,
      userAvatar,
      isOnline,
      unreadCount: 0,
    };

    this.directMessagesSignal.update((dms) => [...dms, newDM]);
    this.saveToStorage();
    return newDM;
  }

  /**
   * Delete conversation
   */
  deleteConversation(conversationId: string): void {
    this.directMessagesSignal.update((dms) => dms.filter((dm) => dm.id !== conversationId));
    this.messagesSignal.update((messages) =>
      messages.filter((msg) => msg.conversationId !== conversationId)
    );
    this.saveToStorage();
  }

  /**
   * Reset to initial data
   */
  reset(): void {
    this.setInitialDMData();
    this.setInitialMessagesData();
  }

  /**
   * Clear all data
   */
  clearAll(): void {
    this.directMessagesSignal.set([]);
    this.messagesSignal.set([]);
    localStorage.removeItem(STORAGE_KEY_DM);
    localStorage.removeItem(STORAGE_KEY_MESSAGES);
  }
}
