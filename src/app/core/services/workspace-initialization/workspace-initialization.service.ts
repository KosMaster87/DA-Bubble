/**
 * @fileoverview Workspace Initialization Service
 * @description Handles workspace data loading and initial navigation setup
 * @module core/services/workspace-initialization
 */

import { Injectable, inject, effect } from '@angular/core';
import { ChannelStore, UserStore } from '@stores/index';
import { NavigationService } from '@core/services/navigation/navigation.service';

@Injectable({
  providedIn: 'root',
})
export class WorkspaceInitializationService {
  private channelStore = inject(ChannelStore);
  private userStore = inject(UserStore);
  private navigationService = inject(NavigationService);

  private hasInitialized = false;

  /**
   * Initialize workspace: load stores and setup auto-selection
   * Should be called once on workspace/dashboard initialization
   * @param onChannelSelected Optional callback when channel is auto-selected
   */
  initialize(onChannelSelected?: (channelId: string) => void): void {
    if (this.hasInitialized) {
      console.log('⚠️  Workspace already initialized, skipping');
      return;
    }

    // Load data from stores
    this.channelStore.loadChannels();
    this.userStore.loadUsers();

    // Setup auto-selection for DABubble-welcome channel
    this.setupAutoSelection(onChannelSelected);

    this.hasInitialized = true;
    console.log('✅ Workspace initialized');
  }

  /**
   * Setup auto-selection effect for DABubble-welcome channel
   * Only triggers once when channels are loaded and nothing is selected
   */
  private setupAutoSelection(onChannelSelected?: (channelId: string) => void): void {
    effect(() => {
      const channels = this.channelStore.channels();
      const currentSelected = this.navigationService.getSelectedChannelId()();
      const currentDM = this.navigationService.getSelectedDirectMessageId()();

      // Only auto-select if NOTHING is selected yet (no channel AND no DM) AND channels just loaded
      if (!currentSelected && !currentDM && channels.length > 0) {
        const welcomeChannel = channels.find((ch) => ch.name === 'DABubble-welcome');
        if (welcomeChannel) {
          this.navigationService.selectChannelById(welcomeChannel.id);

          // Call optional callback for parent component
          if (onChannelSelected) {
            onChannelSelected(welcomeChannel.id);
          }

          console.log('✅ Auto-selected DABubble-welcome channel');
        }
      }
    });
  }

  /**
   * Reset initialization flag (for testing/hot reload)
   */
  reset(): void {
    this.hasInitialized = false;
  }
}
