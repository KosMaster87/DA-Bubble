/**
 * @fileoverview Invitation Navigation Service
 * @description Coordinates invitation-driven routing with debounce and cancellation guards so automatic redirects never override active user navigation.
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
    * @description Runs channel redirects through a guarded delayed path so invitation clicks are deduplicated and still cancellable during user-driven route changes.
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
   * @description Returns true when the same channel was navigated to within the debounce window, preventing duplicate navigations from rapid invitation clicks.
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
   * @description Records the channel ID and current timestamp so subsequent calls within the debounce window can be detected.
   * @param channelId Channel ID being navigated to
   */
  private trackNavigation(channelId: string): void {
    this.lastNavigatedChannel = { id: channelId, timestamp: Date.now() };
  }

  /**
   * Schedule navigation with timeout
   * @description Wraps the timeout in a Promise so the caller can await the entire navigation attempt, including cancellation detection.
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
   * @description Checks that the pending navigation hasn’t been cancelled and that the user is still on a dashboard route before executing.
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
   * @description Validates that the pending navigation target hasn’t changed since the timeout was set, guarding against mid-flight cancellations.
   * @param channelId Channel ID to check
   * @returns True if navigation is still pending
   */
  private isNavigationStillPending(channelId: string): boolean {
    return this.pendingNavigation?.channelId === channelId;
  }

  /**
   * Check if navigation should execute based on current URL
   * @description Limits invitation-driven navigation to dashboard entry/mailbox routes so it can’t override a channel or DM the user has already opened.
   * @param currentUrl Current router URL
   * @returns True if navigation should execute
   */
  private shouldExecuteNavigation(currentUrl: string): boolean {
    return currentUrl === '/dashboard' || currentUrl.includes('/dashboard/mailbox');
  }

  /**
   * Cancel any pending invitation-triggered navigation
   * Call this when user manually navigates to prevent override
   * @description Clears the scheduled timeout and nullifies the pending navigation so no automatic redirect fires after manual navigation.
   */
  cancelPendingNavigation(): void {
    if (this.pendingNavigation) {
      clearTimeout(this.pendingNavigation.timeoutId);
      console.log(
        '🚫 User navigation - cancelled pending invitation navigation to:',
        this.pendingNavigation.channelId,
      );
      this.pendingNavigation = null;
    }
  }
}
