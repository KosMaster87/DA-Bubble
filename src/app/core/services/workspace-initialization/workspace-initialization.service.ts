/**
 * @fileoverview Workspace Initialization Service
 * @description Coordinates workspace data loading and initial navigation setup
 * @module core/services/workspace-initialization
 */

import { Injectable, inject } from '@angular/core';
import { WorkspaceDataLoaderService } from './workspace-data-loader.service';
import { WelcomeChannelSelectorService } from './welcome-channel-selector.service';

@Injectable({
  providedIn: 'root',
})
export class WorkspaceInitializationService {
  private dataLoader = inject(WorkspaceDataLoaderService);
  private welcomeSelector = inject(WelcomeChannelSelectorService);

  private hasInitialized = false;

  /**
   * Initialize workspace: load stores and setup auto-selection
   * Should be called once on workspace/dashboard initialization
   * @param onChannelSelected Optional callback when channel is auto-selected
   */
  initialize(onChannelSelected?: (channelId: string) => void): void {
    if (this.hasInitialized) {
      return;
    }

    // Load workspace data
    this.dataLoader.loadWorkspaceData();

    // Setup auto-selection for DABubble-welcome channel
    this.welcomeSelector.setupAutoSelection(onChannelSelected);

    this.hasInitialized = true;
  }

  /**
   * Select DABubble-welcome channel explicitly
   * Used when navigating back to /dashboard
   */
  selectWelcomeChannel(): void {
    this.welcomeSelector.selectWelcomeChannel();
  }

  /**
   * Reset auto-select suppression (allow user to navigate normally after back-to-sidebar)
   */
  resetAutoSelectSuppression(): void {
    this.welcomeSelector.resetSuppression();
  }

  /**
   * Reset initialization flag (for testing/hot reload)
   */
  reset(): void {
    this.hasInitialized = false;
    this.welcomeSelector.reset();
  }
}
