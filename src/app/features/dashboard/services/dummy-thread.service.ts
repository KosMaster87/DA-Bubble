/**
 * @fileoverview Dummy Thread Service
 * @description Manages thread replies for messages (localStorage-based)
 * @module features/dashboard/services
 */

import { Injectable, signal } from '@angular/core';

export interface ThreadReply {
  id: string;
  parentMessageId: string;
  senderId: string;
  senderName: string;
  senderAvatar: string;
  content: string;
  timestamp: Date;
  isOwnMessage: boolean;
}

@Injectable({
  providedIn: 'root',
})
export class DummyThreadService {
  private readonly STORAGE_KEY = 'dabubble_threads';
  private threads = signal<Map<string, ThreadReply[]>>(this.loadThreads());

  /**
   * Load threads from localStorage
   */
  private loadThreads(): Map<string, ThreadReply[]> {
    const stored = localStorage.getItem(this.STORAGE_KEY);
    if (!stored) {
      return this.initializeDummyThreads();
    }

    try {
      const parsed = JSON.parse(stored);
      const map = new Map<string, ThreadReply[]>();

      Object.entries(parsed).forEach(([messageId, replies]) => {
        map.set(
          messageId,
          (replies as any[]).map((r) => ({
            ...r,
            timestamp: new Date(r.timestamp),
          }))
        );
      });

      return map;
    } catch {
      return this.initializeDummyThreads();
    }
  }

  /**
   * Initialize with dummy thread data
   */
  private initializeDummyThreads(): Map<string, ThreadReply[]> {
    const map = new Map<string, ThreadReply[]>();

    // Example threads for different messages
    map.set('msg-1', [
      {
        id: 'thread-1-reply-1',
        parentMessageId: 'msg-1',
        senderId: '3',
        senderName: 'Noah Braun',
        senderAvatar: '/img/profile/profile-3.png',
        content: 'Gute Idee! Ich kann bei der Implementierung helfen.',
        timestamp: new Date('2024-12-27T08:20:00'),
        isOwnMessage: false,
      },
      {
        id: 'thread-1-reply-2',
        parentMessageId: 'msg-1',
        senderId: '2',
        senderName: 'Du',
        senderAvatar: '/img/profile/profile-2.png',
        content: 'Perfekt! Lass mich dafür ein Task erstellen.',
        timestamp: new Date('2024-12-27T08:25:00'),
        isOwnMessage: true,
      },
    ]);

    map.set('msg-2', [
      {
        id: 'thread-2-reply-1',
        parentMessageId: 'msg-2',
        senderId: '4',
        senderName: 'Elias Neumann',
        senderAvatar: '/img/profile/profile-4.png',
        content: 'Wann soll das Meeting stattfinden?',
        timestamp: new Date('2024-12-27T14:10:00'),
        isOwnMessage: false,
      },
      {
        id: 'thread-2-reply-2',
        parentMessageId: 'msg-2',
        senderId: '1',
        senderName: 'Sofia Müller',
        senderAvatar: '/img/profile/profile-1.png',
        content: 'Wie wäre es mit Donnerstag um 10 Uhr?',
        timestamp: new Date('2024-12-27T14:15:00'),
        isOwnMessage: false,
      },
      {
        id: 'thread-2-reply-3',
        parentMessageId: 'msg-2',
        senderId: '2',
        senderName: 'Du',
        senderAvatar: '/img/profile/profile-2.png',
        content: 'Das passt mir gut!',
        timestamp: new Date('2024-12-27T14:20:00'),
        isOwnMessage: true,
      },
    ]);

    this.saveThreads(map);
    return map;
  }

  /**
   * Save threads to localStorage
   */
  private saveThreads(threads: Map<string, ThreadReply[]>): void {
    const obj: Record<string, ThreadReply[]> = {};
    threads.forEach((replies, messageId) => {
      obj[messageId] = replies;
    });
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(obj));
  }

  /**
   * Get all replies for a specific message
   */
  getRepliesForMessage(messageId: string): ThreadReply[] {
    return this.threads().get(messageId) || [];
  }

  /**
   * Get thread count for a message
   */
  getThreadCount(messageId: string): number {
    return this.threads().get(messageId)?.length || 0;
  }

  /**
   * Get last reply timestamp for a message
   */
  getLastReplyTimestamp(messageId: string): Date | null {
    const replies = this.threads().get(messageId);
    if (!replies || replies.length === 0) return null;

    return replies.reduce((latest, reply) =>
      reply.timestamp > latest ? reply.timestamp : latest,
      replies[0].timestamp
    );
  }

  /**
   * Add a reply to a thread
   */
  addReply(
    parentMessageId: string,
    senderId: string,
    senderName: string,
    senderAvatar: string,
    content: string
  ): ThreadReply {
    const newReply: ThreadReply = {
      id: `thread-${parentMessageId}-reply-${Date.now()}`,
      parentMessageId,
      senderId,
      senderName,
      senderAvatar,
      content,
      timestamp: new Date(),
      isOwnMessage: senderId === '2', // TODO: Use CurrentUserService
    };

    this.threads.update((threads) => {
      const map = new Map(threads);
      const existing = map.get(parentMessageId) || [];
      map.set(parentMessageId, [...existing, newReply]);
      this.saveThreads(map);
      return map;
    });

    return newReply;
  }

  /**
   * Delete a reply from a thread
   */
  deleteReply(parentMessageId: string, replyId: string): void {
    this.threads.update((threads) => {
      const map = new Map(threads);
      const existing = map.get(parentMessageId) || [];
      map.set(
        parentMessageId,
        existing.filter((r) => r.id !== replyId)
      );
      this.saveThreads(map);
      return map;
    });
  }

  /**
   * Clear all threads (for testing)
   */
  clearAllThreads(): void {
    this.threads.set(new Map());
    localStorage.removeItem(this.STORAGE_KEY);
  }
}
