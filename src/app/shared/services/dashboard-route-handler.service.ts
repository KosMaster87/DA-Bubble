/**
 * @fileoverview Dashboard Route Handler Service
 * @description Handles all route parameter changes and navigation logic for dashboard
 * @module shared/services
 */

import { Injectable, inject } from '@angular/core';
import { Router } from '@angular/router';
import { type RouteParams, NavigationService } from '@core/services/navigation/navigation.service';
import { WorkspaceInitializationService } from '@core/services/workspace-initialization/workspace-initialization.service';
import { DashboardStateService } from './dashboard-state.service';
import { DashboardThreadCoordinatorService } from './dashboard-thread-coordinator.service';

@Injectable({ providedIn: 'root' })
export class DashboardRouteHandlerService {
  private router = inject(Router);
  private navigationService = inject(NavigationService);
  private workspaceInit = inject(WorkspaceInitializationService);
  private dashboardState = inject(DashboardStateService);
  private threadCoordinator = inject(DashboardThreadCoordinatorService);

  /**
   * Handle route parameter changes
   * @description Routes to appropriate handler based on path and parameters
   * @param params - Route parameters containing path, id, and optional threadId
   * @param callbacks - Callback functions for view changes
   * @returns void
   */
  handleRouteChange = (
    params: RouteParams,
    callbacks: {
      showWelcome: () => void;
      showMailbox: () => void;
      showLegal: () => void;
      showChannel: (id: string) => void;
      showDirectMessage: (id: string) => void;
    }
  ): void => {
    const { path, id, threadId } = params;
    if (!path) return this.handleDashboardRoot(callbacks.showWelcome);
    if (path === 'channel' && id) return this.handleChannelRoute(id, threadId, callbacks.showChannel);
    if (path === 'dm' && id) return this.handleDirectMessageRoute(id, threadId, callbacks.showDirectMessage);
    if (path === 'mailbox') return this.handleMailboxRoute(callbacks.showMailbox);
    if (path === 'legal') return this.handleLegalRoute(callbacks.showLegal);
  };

  /**
   * Handle dashboard root route
   * @description Closes threads, selects welcome channel, and ensures clean URL
   * @param showWelcome - Callback to show welcome view
   * @returns void
   */
  private handleDashboardRoot = (showWelcome: () => void): void => {
    this.threadCoordinator.closeThreadIfOpen();
    this.workspaceInit.selectWelcomeChannel();
    showWelcome();
    this.ensureCleanDashboardUrl();
  };

  /**
   * Ensure clean dashboard URL
   * @description Navigates to /dashboard if URL contains additional segments
   * @returns void
   */
  private ensureCleanDashboardUrl = (): void => {
    const url = this.router.url;
    if (url !== '/dashboard' && !url.startsWith('/dashboard?')) {
      this.router.navigate(['/dashboard'], { replaceUrl: true });
    }
  };

  /**
   * Handle mailbox route
   * @description Closes threads, selects mailbox, and shows mailbox view
   * @param showMailbox - Callback to show mailbox view
   * @returns void
   */
  private handleMailboxRoute = (showMailbox: () => void): void => {
    this.threadCoordinator.closeThreadIfOpen();
    this.navigationService.selectChannelById('mailbox');
    showMailbox();
  };

  /**
   * Handle legal route
   * @description Closes threads, selects legal view, and shows legal content
   * @param showLegal - Callback to show legal view
   * @returns void
   */
  private handleLegalRoute = (showLegal: () => void): void => {
    this.threadCoordinator.closeThreadIfOpen();
    this.navigationService.selectChannelById('legal');
    showLegal();
  };

  /**
   * Handle channel route
   * @description Navigates to channel, manages thread state, and opens thread if specified in URL
   * @param channelId - Unique identifier of the channel
   * @param threadId - Optional thread ID to open
   * @param showChannel - Callback to show channel view
   * @returns void
   */
  private handleChannelRoute = (channelId: string, threadId: string | undefined, showChannel: (id: string) => void): void => {
    const previousId = this.navigationService.getSelectedChannelId()();
    const shouldKeepThread = !!threadId;

    this.navigationService.selectChannelById(channelId);
    this.threadCoordinator.closeThreadIfNeeded(previousId, channelId, shouldKeepThread, false);
    this.threadCoordinator.closeDMThreadIfNeeded();
    showChannel(channelId);

    if (threadId) {
      this.threadCoordinator.openThreadFromUrl(channelId, threadId, false);
    }
  };

  /**
   * Handle direct message route
   * @description Navigates to DM conversation, manages thread state, and opens thread if specified in URL
   * @param dmId - Unique identifier of the direct message conversation
   * @param threadId - Optional thread ID to open
   * @param showDirectMessage - Callback to show DM view
   * @returns void
   */
  private handleDirectMessageRoute = (dmId: string, threadId: string | undefined, showDirectMessage: (id: string) => void): void => {
    const previousId = this.navigationService.getSelectedDirectMessageId()();
    const shouldKeepThread = !!threadId;

    this.navigationService.selectDirectMessageById(dmId);
    this.threadCoordinator.closeThreadIfNeeded(previousId, dmId, shouldKeepThread, true);
    this.threadCoordinator.closeChannelThreadIfNeeded();
    showDirectMessage(dmId);

    if (threadId) {
      this.threadCoordinator.openThreadFromUrl(dmId, threadId, true);
    }
  };
}
