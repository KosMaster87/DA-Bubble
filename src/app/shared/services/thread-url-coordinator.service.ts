/**
 * @fileoverview Thread URL Coordinator Service
 * @description Manages URL synchronization for thread navigation
 * @module shared/services
 */

import { Injectable, inject } from '@angular/core';
import { Router } from '@angular/router';

/**
 * Service for managing thread URL updates and navigation
 */
@Injectable({ providedIn: 'root' })
export class ThreadUrlCoordinatorService {
  private router = inject(Router);

  /**
   * Update URL with thread parameter
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
   * @description Removes /thread/{id} segment from current URL
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
   * @returns True if URL contains /thread/
   */
  private isThreadInUrl(): boolean {
    return this.router.url.includes('/thread/');
  }

  /**
   * Get base URL without thread segment
   * @returns Base URL or null if invalid
   */
  private getBaseUrlWithoutThread(): string | null {
    const urlParts = this.router.url.split('/thread/');
    return urlParts.length > 0 ? urlParts[0] : null;
  }
}
