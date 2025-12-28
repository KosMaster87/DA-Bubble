/**
 * @fileoverview Current User Service
 * @description Service for managing the currently logged-in user
 * @module features/dashboard/services/current-user
 */

import { Injectable, signal, computed } from '@angular/core';

const CURRENT_USER_ID_KEY = 'dabubble_current_user_id';

@Injectable({
  providedIn: 'root',
})
export class CurrentUserService {
  private currentUserIdSignal = signal<string>('1'); // Default: Sofia Müller

  currentUserId = computed(() => this.currentUserIdSignal());

  constructor() {
    this.loadFromStorage();
  }

  /**
   * Load current user ID from localStorage
   */
  private loadFromStorage(): void {
    const stored = localStorage.getItem(CURRENT_USER_ID_KEY);
    if (stored) {
      this.currentUserIdSignal.set(stored);
    } else {
      this.saveToStorage();
    }
  }

  /**
   * Save current user ID to localStorage
   */
  private saveToStorage(): void {
    localStorage.setItem(CURRENT_USER_ID_KEY, this.currentUserIdSignal());
  }

  /**
   * Set current user ID
   */
  setCurrentUserId(userId: string): void {
    this.currentUserIdSignal.set(userId);
    this.saveToStorage();
  }
}
