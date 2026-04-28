/**
 * @fileoverview Workspace Initialization Service
 * @description Coordinates workspace data loading and initial navigation setup
 * @module core/services/workspace-initialization
 */

import { Injectable, inject } from '@angular/core';
import { WelcomeChannelSelectorService } from './welcome-channel-selector.service';
import { WorkspaceDataLoaderService } from './workspace-data-loader.service';

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
   * @description Guards against double-initialisation with a flag so the dashboard component can safely call this on every navigation without re-loading stores.
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
   * @description Allows the dashboard route to restore the default channel view without triggering the one-shot auto-selection guard.
   */
  selectWelcomeChannel(): void {
    this.welcomeSelector.selectWelcomeChannel();
  }

  /**
   * Reset auto-select suppression (allow user to navigate normally after back-to-sidebar)
   * @description Clears the suppression flag so the next entry to the sidebar can auto-navigate to the welcome channel if nothing is selected.
   */
  resetAutoSelectSuppression(): void {
    this.welcomeSelector.resetSuppression();
  }

  /**
   * Reset initialization flag (for testing/hot reload)
   * @description Resets all stateful flags so the workspace can be fully re-initialised in tests or after hot module replacement.
   */
  reset(): void {
    this.hasInitialized = false;
    this.welcomeSelector.reset();
  }
}
