/**
 * @fileoverview Dummy Users Service
 * @description Service for managing dummy user data with localStorage persistence
 * @module features/dashboard/services/dummy-users
 */

import { Injectable, signal, computed } from '@angular/core';

export interface DummyUser {
  id: string;
  name: string;
  email: string;
  avatar: string;
  isOnline: boolean;
  status?: 'online' | 'offline' | 'away';
}

const STORAGE_KEY = 'dabubble_dummy_users';

@Injectable({
  providedIn: 'root',
})
export class DummyUsersService {
  private usersSignal = signal<DummyUser[]>([]);
  users = computed(() => this.usersSignal());
  onlineUsers = computed(() => this.usersSignal().filter((u) => u.isOnline));

  constructor() {
    this.loadFromStorage();
  }

  /**
   * Load users from localStorage
   */
  private loadFromStorage(): void {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        const users = JSON.parse(stored);
        this.usersSignal.set(users);
      } catch (error) {
        console.error('Error loading users from storage:', error);
        this.setInitialData();
      }
    } else {
      this.setInitialData();
    }
  }

  /**
   * Save users to localStorage
   */
  private saveToStorage(): void {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(this.usersSignal()));
  }

  /**
   * Set initial dummy data
   */
  private setInitialData(): void {
    const initialUsers: DummyUser[] = [
      {
        id: '1',
        name: 'Sofia Müller',
        email: 'sofia.mueller@dabubble.com',
        avatar: '/img/profile/profile-1.png',
        isOnline: true,
        status: 'online',
      },
      {
        id: '2',
        name: 'Noah Braun',
        email: 'noah.braun@dabubble.com',
        avatar: '/img/profile/profile-2.png',
        isOnline: false,
        status: 'offline',
      },
      {
        id: '3',
        name: 'Eva Schmidt',
        email: 'eva.schmidt@dabubble.com',
        avatar: '/img/profile/profile-3.png',
        isOnline: false,
        status: 'offline',
      },
      {
        id: '4',
        name: 'Lukas Fischer',
        email: 'lukas.fischer@dabubble.com',
        avatar: '/img/profile/profile-4.png',
        isOnline: true,
        status: 'online',
      },
      {
        id: '5',
        name: 'Mia Wagner',
        email: 'mia.wagner@dabubble.com',
        avatar: '/img/profile/profile-1.png',
        isOnline: true,
        status: 'online',
      },
      {
        id: '6',
        name: 'Finn Weber',
        email: 'finn.weber@dabubble.com',
        avatar: '/img/profile/profile-2.png',
        isOnline: false,
        status: 'offline',
      },
      {
        id: '7',
        name: 'Konstantin Neumann',
        email: 'konstantin.neumann@dabubble.com',
        avatar: '/img/profile/profile-3.png',
        isOnline: false,
        status: 'offline',
      },
      {
        id: '8',
        name: 'Anna Hoffmann',
        email: 'anna.hoffmann@dabubble.com',
        avatar: '/img/profile/profile-4.png',
        isOnline: true,
        status: 'online',
      },
    ];

    this.usersSignal.set(initialUsers);
    this.saveToStorage();
  }

  /**
   * Get user by ID
   */
  getUserById(id: string): DummyUser | undefined {
    return this.usersSignal().find((u) => u.id === id);
  }

  /**
   * Add new user
   */
  addUser(user: Omit<DummyUser, 'id'>): DummyUser {
    const newUser: DummyUser = {
      ...user,
      id: Date.now().toString(),
    };

    this.usersSignal.update((users) => [...users, newUser]);
    this.saveToStorage();
    return newUser;
  }

  /**
   * Update user
   */
  updateUser(id: string, updates: Partial<DummyUser>): void {
    this.usersSignal.update((users) =>
      users.map((user) => (user.id === id ? { ...user, ...updates } : user))
    );
    this.saveToStorage();
  }

  /**
   * Delete user
   */
  deleteUser(id: string): void {
    this.usersSignal.update((users) => users.filter((u) => u.id !== id));
    this.saveToStorage();
  }

  /**
   * Set user online status
   */
  setUserOnlineStatus(id: string, isOnline: boolean): void {
    this.updateUser(id, {
      isOnline,
      status: isOnline ? 'online' : 'offline',
    });
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
    this.usersSignal.set([]);
    localStorage.removeItem(STORAGE_KEY);
  }
}
