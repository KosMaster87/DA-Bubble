/**
 * @fileoverview Dashboard Route Reuse Strategy
 * @description Keeps DashboardComponent alive across child-route transitions so layout effects, signals, and DOM state are not reset when the user switches between mailbox, channels, or DMs.
 * @module core/strategies
 */

import { Injectable } from '@angular/core';
import { ActivatedRouteSnapshot, BaseRouteReuseStrategy } from '@angular/router';

/**
 * Custom route reuse strategy that keeps the Dashboard component instance
 * alive when navigating between dashboard routes (mailbox, channels, DMs).
 *
 * @description Prevents Angular from destroying and recreating DashboardComponent on every child-route navigation, which would re-run lifecycle hooks, re-subscribe to Firestore streams, and lose transient UI state such as open panels or scroll positions.
 */
@Injectable()
export class DashboardReuseStrategy extends BaseRouteReuseStrategy {
  /**
   * Determines if a route should be reused.
   * @description Returns `true` for all known dashboard child paths so Angular reuses the existing component instance instead of recreating it; falls back to the default strategy for all other routes.
   */
  override shouldReuseRoute(future: ActivatedRouteSnapshot, curr: ActivatedRouteSnapshot): boolean {
    // Get the full paths
    const futurePath = future.routeConfig?.path || '';
    const currPath = curr.routeConfig?.path || '';

    // If both are dashboard routes (including parameterized routes), reuse the component
    const isDashboardRoute = (path: string) =>
      path === 'dashboard' ||
      path === 'dashboard/channel/:id' ||
      path === 'dashboard/dm/:id' ||
      path === 'dashboard/mailbox' ||
      path === 'dashboard/legal' ||
      path === 'dashboard/settings';

    if (isDashboardRoute(futurePath) && isDashboardRoute(currPath)) {
      return true;
    }

    // Default behavior for non-dashboard routes
    return super.shouldReuseRoute(future, curr);
  }
}
