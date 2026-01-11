/**
 * @fileoverview Dashboard Route Handler Service (Facade)
 * @description Routes dashboard navigation to appropriate handlers
 * @module shared/services
 *
 * This is now a facade that delegates to RouteHandlers for cleaner separation of concerns.
 */

import { Injectable, inject } from '@angular/core';
import { type RouteParams } from '@core/services/navigation/navigation.service';
import { RouteHandlersService } from './route-handlers.service';

@Injectable({ providedIn: 'root' })
export class DashboardRouteHandlerService {
  private handlers = inject(RouteHandlersService);

  /**
   * Handle route parameter changes
   * @description Routes to appropriate handler based on path and parameters
   * @param params - Route parameters containing path, id, and optional threadId
   * @param callbacks - Callback functions for view changes
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

    if (!path) {
      return this.handlers.handleDashboardRoot(callbacks.showWelcome);
    }

    if (path === 'channel' && id) {
      return this.handlers.handleChannelRoute(id, threadId, callbacks.showChannel);
    }

    if (path === 'dm' && id) {
      return this.handlers.handleDirectMessageRoute(id, threadId, callbacks.showDirectMessage);
    }

    if (path === 'mailbox') {
      return this.handlers.handleMailboxRoute(callbacks.showMailbox);
    }

    if (path === 'legal') {
      return this.handlers.handleLegalRoute(callbacks.showLegal);
    }
  };
}
