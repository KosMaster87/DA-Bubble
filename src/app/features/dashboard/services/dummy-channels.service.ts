/**
 * @fileoverview Dummy Channels Service
 * @description Service for managing dummy channel data with localStorage persistence
 * @module features/dashboard/services/dummy-channels
 */

import { Injectable, signal, computed } from '@angular/core';

export interface DummyChannel {
  id: string;
  name: string;
  description: string;
  memberCount: number;
  memberIds: string[];
  createdAt: Date;
  createdBy: string;
}

const STORAGE_KEY = 'dabubble_dummy_channels';

@Injectable({
  providedIn: 'root',
})
export class DummyChannelsService {
  private channelsSignal = signal<DummyChannel[]>([]);
  channels = computed(() => this.channelsSignal());
  channelCount = computed(() => this.channelsSignal().length);

  constructor() {
    this.loadFromStorage();
  }

  /**
   * Load channels from localStorage
   */
  private loadFromStorage(): void {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        const channels = JSON.parse(stored, (key, value) => {
          if (key === 'createdAt') return new Date(value);
          return value;
        });
        this.channelsSignal.set(channels);
      } catch (error) {
        console.error('Error loading channels from storage:', error);
        this.setInitialData();
      }
    } else {
      this.setInitialData();
    }
  }

  /**
   * Save channels to localStorage
   */
  private saveToStorage(): void {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(this.channelsSignal()));
  }

  /**
   * Set initial dummy data
   */
  private setInitialData(): void {
    const initialChannels: DummyChannel[] = [
      {
        id: 'mailbox',
        name: 'Mailbox',
        description: 'System messages, admin notifications, and important updates.',
        memberCount: 8,
        memberIds: ['1', '2', '3', '4', '5', '6', '7', '8'],
        createdAt: new Date('2024-11-20'),
        createdBy: '1',
      },
      {
        id: 'welcome',
        name: 'DABubble-welcome',
        description: 'Welcome to DABubble! General announcements and introductions.',
        memberCount: 8,
        memberIds: ['1', '2', '3', '4', '5', '6', '7', '8'],
        createdAt: new Date('2024-11-20'),
        createdBy: '1',
      },
      {
        id: '1',
        name: 'Entwicklung',
        description: 'Development team channel',
        memberCount: 5,
        memberIds: ['1', '2', '3', '4', '5'],
        createdAt: new Date('2024-12-01'),
        createdBy: '1',
      },
      {
        id: '2',
        name: 'Marketing',
        description: 'Marketing team discussions',
        memberCount: 3,
        memberIds: ['1', '6', '7'],
        createdAt: new Date('2024-12-05'),
        createdBy: '1',
      },
      {
        id: '3',
        name: 'Testing',
        description: 'QA and testing team',
        memberCount: 4,
        memberIds: ['2', '3', '7', '8'],
        createdAt: new Date('2024-12-10'),
        createdBy: '2',
      },
      {
        id: '4',
        name: 'Design',
        description: 'Design team collaboration',
        memberCount: 3,
        memberIds: ['4', '5', '8'],
        createdAt: new Date('2024-12-15'),
        createdBy: '4',
      },
    ];

    this.channelsSignal.set(initialChannels);
    this.saveToStorage();
  }

  /**
   * Get channel by ID
   */
  getChannelById(id: string): DummyChannel | undefined {
    return this.channelsSignal().find((c) => c.id === id);
  }

  /**
   * Get channel by name
   */
  getChannelByName(name: string): DummyChannel | undefined {
    return this.channelsSignal().find((c) => c.name.toLowerCase() === name.toLowerCase());
  }

  /**
   * Add new channel
   */
  addChannel(channel: Omit<DummyChannel, 'id' | 'createdAt' | 'memberCount'>): DummyChannel {
    const newChannel: DummyChannel = {
      ...channel,
      id: Date.now().toString(),
      createdAt: new Date(),
      memberCount: channel.memberIds.length,
    };

    this.channelsSignal.update((channels) => [...channels, newChannel]);
    this.saveToStorage();
    return newChannel;
  }

  /**
   * Update channel
   */
  updateChannel(id: string, updates: Partial<DummyChannel>): void {
    this.channelsSignal.update((channels) =>
      channels.map((channel) => {
        if (channel.id === id) {
          const updated = { ...channel, ...updates };
          // Update member count if memberIds changed
          if (updates.memberIds) {
            updated.memberCount = updates.memberIds.length;
          }
          return updated;
        }
        return channel;
      })
    );
    this.saveToStorage();
  }

  /**
   * Delete channel
   */
  deleteChannel(id: string): void {
    this.channelsSignal.update((channels) => channels.filter((c) => c.id !== id));
    this.saveToStorage();
  }

  /**
   * Add member to channel
   */
  addMemberToChannel(channelId: string, userId: string): void {
    const channel = this.getChannelById(channelId);
    if (channel && !channel.memberIds.includes(userId)) {
      this.updateChannel(channelId, {
        memberIds: [...channel.memberIds, userId],
      });
    }
  }

  /**
   * Remove member from channel
   */
  removeMemberFromChannel(channelId: string, userId: string): void {
    const channel = this.getChannelById(channelId);
    if (channel) {
      this.updateChannel(channelId, {
        memberIds: channel.memberIds.filter((id) => id !== userId),
      });
    }
  }

  /**
   * Get channels for user
   */
  getChannelsForUser(userId: string): DummyChannel[] {
    return this.channelsSignal().filter((channel) => channel.memberIds.includes(userId));
  }

  /**
   * Reset to initial data
   */
  reset(): void {
    this.setInitialData();
  }

  /**
   * Clear all data
   */
  clearAll(): void {
    this.channelsSignal.set([]);
    localStorage.removeItem(STORAGE_KEY);
  }
}
