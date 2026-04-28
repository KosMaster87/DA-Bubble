/**
 * @fileoverview Welcome Channel Selector Service
 * @description Governs one-shot welcome-channel auto-selection while respecting explicit user navigation choices.
 * @module core/services/workspace-initialization
 */

import { Injectable, effect, inject } from '@angular/core';
import { NavigationService } from '@core/services/navigation/navigation.service';
import { ChannelStore } from '@stores/index';

/**
 * Service for managing welcome channel auto-selection
 */
@Injectable({
  providedIn: 'root',
})
export class WelcomeChannelSelectorService {
  private channelStore = inject(ChannelStore);
  private navigationService = inject(NavigationService);

  private hasAutoSelected = false;
  private suppressAutoSelect = false; // Flag to prevent auto-select when user returns to sidebar

  /**
   * Setup auto-selection effect for DABubble-welcome channel
   * Only triggers once when channels are loaded and nothing is selected
   * @description Registers an Angular effect that fires whenever channels load, ensuring new users land in the welcome channel without requiring explicit navigation.
   */
  setupAutoSelection(onChannelSelected?: (channelId: string) => void): void {
    effect(() => {
      const channels = this.channelStore.channels();
      const currentSelected = this.navigationService.getSelectedChannelId()();
      const currentDM = this.navigationService.getSelectedDirectMessageId()();

      if (
        !this.hasAutoSelected &&
        !this.suppressAutoSelect &&
        !currentSelected &&
        !currentDM &&
        channels.length > 0
      ) {
        this.performAutoSelection(channels, onChannelSelected);
      }
    });
  }

  /**
   * Suppress auto-selection (used when user manually returns to sidebar)
   * @description Prevents the auto-selection effect from overriding the user's intentional back-navigation to the sidebar view.
   */
  suppressAutoSelection(): void {
    this.suppressAutoSelect = true;
  }

  /**
   * Check if auto-select is currently suppressed
   * @description Lets the initialization orchestrator query suppression state before deciding whether to call selectWelcomeChannel.
   */
  isAutoSelectSuppressed(): boolean {
    return this.suppressAutoSelect;
  }

  /**
   * Reset suppression (allow auto-select again on next page load)
   * @description Clears the suppression flag so the effect can trigger again on future channel loads after the user explicitly returns to the workspace root.
   */
  resetSuppression(): void {
    this.suppressAutoSelect = false;
  }

  /**
   * Perform auto-selection of welcome channel
   * @description Sets the one-shot flag after navigation so subsequent channel-store changes don't re-trigger the auto-select.
   */
  private performAutoSelection(
    channels: any[],
    onChannelSelected?: (channelId: string) => void,
  ): void {
    const welcomeChannel = channels.find((ch) => ch.name === 'DABubble-welcome');
    if (welcomeChannel) {
      this.navigationService.selectChannel(welcomeChannel.id); // Use selectChannel to update URL
      this.hasAutoSelected = true; // Prevent future auto-selections

      // Call optional callback for parent component
      if (onChannelSelected) {
        onChannelSelected(welcomeChannel.id);
      }

      console.log('✅ Auto-selected DABubble-welcome channel');
    }
  }

  /**
   * Select DABubble-welcome channel explicitly
   * Used when navigating back to /dashboard
   * @description Bypasses the one-shot auto-select guard to allow explicit navigation to the welcome channel from the dashboard route.
   */
  selectWelcomeChannel(): void {
    const channels = this.channelStore.channels();
    const welcomeChannel = channels.find((ch) => ch.name === 'DABubble-welcome');
    if (welcomeChannel) {
      this.navigationService.selectChannel(welcomeChannel.id); // Use selectChannel to update URL
    }
  }

  /**
   * Find welcome channel ID
   * @description Utility for callers that need the welcome channel ID without triggering navigation.
   * @returns Welcome channel ID or null if not found
   */
  findWelcomeChannelId(): string | null {
    const channels = this.channelStore.channels();
    const welcomeChannel = channels.find((ch) => ch.name === 'DABubble-welcome');
    return welcomeChannel?.id || null;
  }

  /**
   * Reset auto-selection flag (for testing/hot reload)
   * @description Resets the one-shot guard so auto-selection can fire again in tests or after hot module replacement.
   */
  reset(): void {
    this.hasAutoSelected = false;
  }
}
