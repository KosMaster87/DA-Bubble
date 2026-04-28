/**
 * @fileoverview Thread URL Coordinator Service
 * @description Synchronizes thread-open state with URL segments so deep links and back-navigation reflect the active thread context.
 * @module shared/services
 */

import { Injectable, inject } from '@angular/core';
import { Router } from '@angular/router';

/**
 * Service for managing thread URL updates and navigation
 * @description Centralizes thread-route mutations so deep-linking and in-app navigation update URL state through one consistent strategy.
 */
@Injectable({ providedIn: 'root' })
export class ThreadUrlCoordinatorService {
  private router = inject(Router);

  /**
   * Update URL with thread parameter
   * @description Appends thread route segments only when absent to avoid redundant navigations and history noise.
   * @param threadId Thread message ID
   * @param conversationId Channel or DM conversation ID
   * @param isDM Whether this is a DM thread
   */
  updateUrlWithThread = (threadId: string, conversationId: string, isDM: boolean): void => {
    if (this.isThreadInUrl()) return;

    const path = isDM ? 'dm' : 'channel';
    this.router.navigate(['/dashboard', path, conversationId, 'thread', threadId], {
      replaceUrl: true,
    });
  };

  /**
   * Remove thread from URL
   * @description Strips thread segments from the current route so closing a thread returns navigation to the parent conversation URL.
   */
  removeThreadFromUrl = (): void => {
    if (!this.isThreadInUrl()) return;

    const baseUrl = this.getBaseUrlWithoutThread();
    if (baseUrl) {
      this.router.navigate([baseUrl], { replaceUrl: true });
    }
  };

  /**
   * Check if thread parameter is in URL
   * @description Uses a lightweight URL check to guard navigation calls and prevent unnecessary router operations.
   * @returns True if URL contains /thread/
   */
  private isThreadInUrl(): boolean {
    return this.router.url.includes('/thread/');
  }

  /**
   * Get base URL without thread segment
   * @description Derives the parent conversation URL so thread-close navigation can reuse the already active route context.
   * @returns Base URL or null if invalid
   */
  private getBaseUrlWithoutThread(): string | null {
    const urlParts = this.router.url.split('/thread/');
    return urlParts.length > 0 ? urlParts[0] : null;
  }
}
