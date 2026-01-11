/**
 * @fileoverview Route Handlers
 * @description Individual route handling logic for dashboard routes
 * @module shared/services/route-handlers
 */

import { Injectable, inject } from '@angular/core';
import { Router } from '@angular/router';
import { NavigationService } from '@core/services/navigation/navigation.service';
import { WorkspaceInitializationService } from '@core/services/workspace-initialization/workspace-initialization.service';
import { DashboardThreadCoordinatorService } from './dashboard-thread-coordinator.service';

@Injectable({ providedIn: 'root' })
export class RouteHandlersService {
  private router = inject(Router);
  private navigationService = inject(NavigationService);
  private workspaceInit = inject(WorkspaceInitializationService);
  private threadCoordinator = inject(DashboardThreadCoordinatorService);

  /**
   * Handle dashboard root route
   * @param showWelcome - Callback to show welcome view
   */
  handleDashboardRoot = (showWelcome: () => void): void => {
    this.threadCoordinator.closeThreadIfOpen();
    this.workspaceInit.selectWelcomeChannel();
    showWelcome();
    this.ensureCleanDashboardUrl();
  };

  /**
   * Handle mailbox route
   * @param showMailbox - Callback to show mailbox view
   */
  handleMailboxRoute = (showMailbox: () => void): void => {
    this.threadCoordinator.closeThreadIfOpen();
    this.navigationService.selectChannelById('mailbox');
    showMailbox();
  };

  /**
   * Handle legal route
   * @param showLegal - Callback to show legal view
   */
  handleLegalRoute = (showLegal: () => void): void => {
    this.threadCoordinator.closeThreadIfOpen();
    this.navigationService.selectChannelById('legal');
    showLegal();
  };

  /**
   * Handle channel route
   * @param channelId - Unique identifier of the channel
   * @param threadId - Optional thread ID to open
   * @param showChannel - Callback to show channel view
   */
  handleChannelRoute = (
    channelId: string,
    threadId: string | undefined,
    showChannel: (id: string) => void
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
   * @param dmId - Unique identifier of the direct message conversation
   * @param threadId - Optional thread ID to open
   * @param showDirectMessage - Callback to show DM view
   */
  handleDirectMessageRoute = (
    dmId: string,
    threadId: string | undefined,
    showDirectMessage: (id: string) => void
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
   * @description Navigates to /dashboard if URL contains additional segments
   */
  private ensureCleanDashboardUrl = (): void => {
    const url = this.router.url;
    if (url !== '/dashboard' && !url.startsWith('/dashboard?')) {
      this.router.navigate(['/dashboard'], { replaceUrl: true });
    }
  };
}
