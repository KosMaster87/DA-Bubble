/**
 * @fileoverview Welcome Channel Selector Service
 * @description Handles auto-selection of DABubble-welcome channel
 * @module core/services/workspace-initialization
 */

import { Injectable, inject, effect } from '@angular/core';
import { ChannelStore } from '@stores/index';
import { NavigationService } from '@core/services/navigation/navigation.service';

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

  /**
   * Setup auto-selection effect for DABubble-welcome channel
   * Only triggers once when channels are loaded and nothing is selected
   */
  setupAutoSelection(onChannelSelected?: (channelId: string) => void): void {
    effect(() => {
      const channels = this.channelStore.channels();
      const currentSelected = this.navigationService.getSelectedChannelId()();
      const currentDM = this.navigationService.getSelectedDirectMessageId()();

      if (!this.hasAutoSelected && !currentSelected && !currentDM && channels.length > 0) {
        this.performAutoSelection(channels, onChannelSelected);
      }
    });
  }

  /**
   * Perform auto-selection of welcome channel
   */
  private performAutoSelection(
    channels: any[],
    onChannelSelected?: (channelId: string) => void
  ): void {
    const welcomeChannel = channels.find((ch) => ch.name === 'DABubble-welcome');
    if (welcomeChannel) {
      this.navigationService.selectChannelById(welcomeChannel.id);
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
   */
  selectWelcomeChannel(): void {
    const channels = this.channelStore.channels();
    const welcomeChannel = channels.find((ch) => ch.name === 'DABubble-welcome');
    if (welcomeChannel) {
      this.navigationService.selectChannelById(welcomeChannel.id);
    }
  }

  /**
   * Find welcome channel ID
   * @returns Welcome channel ID or null if not found
   */
  findWelcomeChannelId(): string | null {
    const channels = this.channelStore.channels();
    const welcomeChannel = channels.find((ch) => ch.name === 'DABubble-welcome');
    return welcomeChannel?.id || null;
  }

  /**
   * Reset auto-selection flag (for testing/hot reload)
   */
  reset(): void {
    this.hasAutoSelected = false;
  }
}
