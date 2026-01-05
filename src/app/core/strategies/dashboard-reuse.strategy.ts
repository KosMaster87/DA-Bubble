/**
 * @fileoverview Dashboard Route Reuse Strategy
 * @description Custom route reuse strategy to keep DashboardComponent alive across route changes
 * @module core/strategies
 */

import { Injectable } from '@angular/core';
import { ActivatedRouteSnapshot, BaseRouteReuseStrategy } from '@angular/router';

/**
 * Custom route reuse strategy that keeps the Dashboard component instance
 * alive when navigating between dashboard routes (mailbox, channels, DMs).
 *
 * This prevents the component from being destroyed and recreated on each navigation,
 * which would reset state and re-run constructor logic.
 */
@Injectable()
export class DashboardReuseStrategy extends BaseRouteReuseStrategy {
  /**
   * Determines if a route should be reused.
   * Returns true for all dashboard routes to keep the component alive.
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
      path === 'dashboard/mailbox';

    if (isDashboardRoute(futurePath) && isDashboardRoute(currPath)) {
      console.log('🔄 Reusing Dashboard component:', { from: currPath, to: futurePath });
      return true;
    }

    // Default behavior for non-dashboard routes
    return super.shouldReuseRoute(future, curr);
  }
}
