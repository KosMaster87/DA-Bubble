/**
 * @fileoverview Route Parser Service
 * @description Parses URLs and provides reactive route parameters
 * @module core/services/navigation
 */

import { Injectable, inject, Signal } from '@angular/core';
import { Router, NavigationEnd } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { filter, map } from 'rxjs/operators';

/**
 * Parsed route parameters from URL
 */
export interface RouteParams {
  path: string | undefined;
  id: string | undefined;
  threadId: string | undefined;
}

/**
 * Service for parsing and tracking route changes
 */
@Injectable({
  providedIn: 'root',
})
export class RouteParserService {
  private router = inject(Router);

  /**
   * Reactive route signal - parses URL to extract route type and ID
   * Automatically updated on every Angular Router NavigationEnd event
   */
  private routeParams = toSignal(
    this.router.events.pipe(
      filter((event): event is NavigationEnd => event instanceof NavigationEnd),
      map(() => this.parseUrl(this.router.url))
    ),
    { initialValue: { path: undefined, id: undefined, threadId: undefined } }
  );

  /**
   * Get current route parameters as signal
   */
  getRouteParams(): Signal<RouteParams> {
    return this.routeParams;
  }

  /**
   * Parse URL to extract route type and ID
   *
   * Examples:
   * - /dashboard → {path: undefined, id: undefined, threadId: undefined}
   * - /dashboard/mailbox → {path: 'mailbox', id: undefined, threadId: undefined}
   * - /dashboard/channel/123 → {path: 'channel', id: '123', threadId: undefined}
   * - /dashboard/channel/123/thread/456 → {path: 'channel', id: '123', threadId: '456'}
   * - /dashboard/dm/789 → {path: 'dm', id: '789', threadId: undefined}
   * - /dashboard/dm/789/thread/456 → {path: 'dm', id: '789', threadId: '456'}
   */
  parseUrl(url: string): RouteParams {
    const parts = url.split('/').filter((p) => p); // Remove empty strings

    if (parts.length === 1 && parts[0] === 'dashboard') {
      return { path: undefined, id: undefined, threadId: undefined };
    }

    if (parts.length >= 2 && parts[0] === 'dashboard') {
      const type = parts[1]; // 'mailbox', 'channel', or 'dm'
      const id = parts[2]; // channel/dm ID (if exists)
      const threadId = parts[3] === 'thread' ? parts[4] : undefined; // Works for both channel and DM threads

      return { path: type, id, threadId };
    }

    return { path: undefined, id: undefined, threadId: undefined };
  }
}
