/**
 * @fileoverview Route Handlers
 * @description Individual route handling logic for dashboard routes
 * @module shared/services/route-handlers
 */

import { Injectable, inject } from '@angular/core';
import { Router } from '@angular/router';
import { NavigationService } from '@core/services/navigation/navigation.service';
import { WelcomeChannelSelectorService } from '@core/services/workspace-initialization/welcome-channel-selector.service';
import { WorkspaceInitializationService } from '@core/services/workspace-initialization/workspace-initialization.service';
import { DashboardThreadCoordinatorService } from './dashboard-thread-coordinator.service';

@Injectable({ providedIn: 'root' })
export class RouteHandlersService {
  private router = inject(Router);
  private navigationService = inject(NavigationService);
  private workspaceInit = inject(WorkspaceInitializationService);
  private welcomeSelector = inject(WelcomeChannelSelectorService);
  private threadCoordinator = inject(DashboardThreadCoordinatorService);

  /**
   * Handle dashboard root route
   * @description Applies root-entry behavior by resetting thread context and optionally auto-selecting welcome content.
   * @param showWelcome - Callback to show welcome view
   */
  handleDashboardRoot = (showWelcome: () => void): void => {
    this.threadCoordinator.closeThreadIfOpen();

    // Only select welcome channel if auto-select is not suppressed (user didn't manually return to sidebar)
    if (!this.welcomeSelector.isAutoSelectSuppressed()) {
      this.workspaceInit.selectWelcomeChannel();
      showWelcome();
      this.ensureCleanDashboardUrl();
    }
    // If suppressed, do nothing - just show sidebar without selecting a channel
  };

  /**
   * Handle mailbox route
   * @description Switches route state to mailbox after thread teardown and channel selection synchronization.
   * @param showMailbox - Callback to show mailbox view
   */
  handleMailboxRoute = (showMailbox: () => void): void => {
    this.threadCoordinator.closeThreadIfOpen();
    this.navigationService.selectChannelById('mailbox');
    showMailbox();
  };

  /**
   * Handle legal route
   * @description Switches route state to legal page while ensuring thread UI does not remain open from prior contexts.
   * @param showLegal - Callback to show legal view
   */
  handleLegalRoute = (showLegal: () => void): void => {
    this.threadCoordinator.closeThreadIfOpen();
    this.navigationService.selectChannelById('legal');
    showLegal();
  };

  /**
   * Handle settings route
   * @description Switches route state to settings and normalizes selection/thread state before rendering settings content.
   * @param showSettings - Callback to show settings view
   */
  handleSettingsRoute = (showSettings: () => void): void => {
    this.threadCoordinator.closeThreadIfOpen();
    this.navigationService.selectChannelById('settings');
    showSettings();
  };

  /**
   * Handle channel route
   * @description Coordinates channel navigation, thread-preservation rules, and optional URL-driven thread opening.
   * @param channelId - Unique identifier of the channel
   * @param threadId - Optional thread ID to open
   * @param showChannel - Callback to show channel view
   */
  handleChannelRoute = (
    channelId: string,
    threadId: string | undefined,
    showChannel: (id: string) => void,
  ): void => {
    const previousId = this.navigationService.getSelectedChannelId()();
    const shouldKeepThread = !!threadId;

    this.navigationService.selectChannelById(channelId);
    this.threadCoordinator.closeThreadIfNeeded(previousId, channelId, shouldKeepThread, false);

    if (!shouldKeepThread) {
      this.threadCoordinator.closeDMThreadIfNeeded();
    }

    showChannel(channelId);

    if (threadId) {
      this.threadCoordinator.openThreadFromUrl(channelId, threadId, false);
    }
  };

  /**
   * Handle direct message route
   * @description Coordinates DM navigation, thread-preservation rules, and optional URL-driven DM-thread opening.
   * @param dmId - Unique identifier of the direct message conversation
   * @param threadId - Optional thread ID to open
   * @param showDirectMessage - Callback to show DM view
   */
  handleDirectMessageRoute = (
    dmId: string,
    threadId: string | undefined,
    showDirectMessage: (id: string) => void,
  ): void => {
    const previousId = this.navigationService.getSelectedDirectMessageId()();
    const shouldKeepThread = !!threadId;

    this.navigationService.selectDirectMessageById(dmId);
    this.threadCoordinator.closeThreadIfNeeded(previousId, dmId, shouldKeepThread, true);

    if (!shouldKeepThread) {
      this.threadCoordinator.closeChannelThreadIfNeeded();
    }

    showDirectMessage(dmId);

    if (threadId) {
      this.threadCoordinator.openThreadFromUrl(dmId, threadId, true);
    }
  };

  /**
   * Ensure clean dashboard URL
   * @description Normalizes the route to bare /dashboard when stale path segments are present.
   */
  private ensureCleanDashboardUrl = (): void => {
    const url = this.router.url;
    if (url !== '/dashboard' && !url.startsWith('/dashboard?')) {
      this.router.navigate(['/dashboard'], { replaceUrl: true });
    }
  };
}
