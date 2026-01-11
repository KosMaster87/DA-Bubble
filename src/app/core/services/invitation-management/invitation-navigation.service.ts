/**
 * @fileoverview Invitation Navigation Service
 * @description Handles navigation logic for accepted invitations with debouncing
 * @module core/services/invitation-management
 */

import { Injectable, inject } from '@angular/core';
import { Router } from '@angular/router';

/**
 * Service for managing navigation triggered by invitation acceptance
 * Includes debouncing and cancellation logic to prevent race conditions
 */
@Injectable({
  providedIn: 'root',
})
export class InvitationNavigationService {
  private router = inject(Router);

  private lastNavigatedChannel: { id: string; timestamp: number } | null = null;
  private pendingNavigation: { channelId: string; timeoutId: any } | null = null;
  private readonly DEBOUNCE_MS = 5000; // 5 seconds debounce

  /**
   * Navigate to channel after delay
   * Cancellable to prevent race conditions with manual navigation
   * @param channelId Channel ID to navigate to
   */
  navigateToChannel = async (channelId: string): Promise<void> => {
    if (this.shouldSkipNavigation(channelId)) return;

    this.trackNavigation(channelId);
    this.cancelPendingNavigation();
    await this.scheduleNavigation(channelId);
  };

  /**
   * Check if navigation should be skipped due to debounce
   * @param channelId Channel ID to check
   * @returns True if navigation should be skipped
   */
  private shouldSkipNavigation(channelId: string): boolean {
    const now = Date.now();
    return (
      !!this.lastNavigatedChannel &&
      this.lastNavigatedChannel.id === channelId &&
      now - this.lastNavigatedChannel.timestamp < this.DEBOUNCE_MS
    );
  }

  /**
   * Track navigation attempt for debouncing
   * @param channelId Channel ID being navigated to
   */
  private trackNavigation(channelId: string): void {
    this.lastNavigatedChannel = { id: channelId, timestamp: Date.now() };
  }

  /**
   * Schedule navigation with timeout
   * @param channelId Channel ID to navigate to
   */
  private scheduleNavigation(channelId: string): Promise<void> {
    return new Promise((resolve) => {
      const timeoutId = setTimeout(async () => {
        await this.executeNavigationIfValid(channelId);
        resolve();
      }, 100);

      this.pendingNavigation = { channelId, timeoutId };
    });
  }

  /**
   * Execute navigation if still valid and user hasn't navigated away
   * @param channelId Channel ID to navigate to
   */
  private async executeNavigationIfValid(channelId: string): Promise<void> {
    if (!this.isNavigationStillPending(channelId)) return;

    const currentUrl = this.router.url;
    if (this.shouldExecuteNavigation(currentUrl)) {
      console.log('✅ Executing navigation to:', channelId);
      await this.router.navigate(['/dashboard', 'channel', channelId]);
    } else {
      console.log('🚫 User already navigated to:', currentUrl, '- skipping invitation navigation');
    }

    this.pendingNavigation = null;
  }

  /**
   * Check if navigation is still pending for given channel
   * @param channelId Channel ID to check
   * @returns True if navigation is still pending
   */
  private isNavigationStillPending(channelId: string): boolean {
    return this.pendingNavigation?.channelId === channelId;
  }

  /**
   * Check if navigation should execute based on current URL
   * @param currentUrl Current router URL
   * @returns True if navigation should execute
   */
  private shouldExecuteNavigation(currentUrl: string): boolean {
    return currentUrl === '/dashboard' || currentUrl.includes('/dashboard/mailbox');
  }

  /**
   * Cancel any pending invitation-triggered navigation
   * Call this when user manually navigates to prevent override
   */
  cancelPendingNavigation(): void {
    if (this.pendingNavigation) {
      clearTimeout(this.pendingNavigation.timeoutId);
      console.log(
        '🚫 User navigation - cancelled pending invitation navigation to:',
        this.pendingNavigation.channelId
      );
      this.pendingNavigation = null;
    }
  }
}
