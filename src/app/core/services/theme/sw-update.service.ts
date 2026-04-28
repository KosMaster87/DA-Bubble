/**
 * @fileoverview Service Worker Update Service
 * @description Orchestrates service-worker update detection and controlled activation so new app versions roll out without disrupting active sessions.
 * @module core/services/theme/sw-update.service
 */

import { ApplicationRef, Injectable } from '@angular/core';
import { SwUpdate, VersionReadyEvent } from '@angular/service-worker';
import { filter, first, interval } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class SwUpdateService {
  constructor(
    private swUpdate: SwUpdate,
    private appRef: ApplicationRef,
  ) {}

  /**
   * Initialize service worker update handling
   * @description Wires up all SW update event handlers and kicks off the first version check once the app stabilises.
   */
  init(): void {
    if (!this.swUpdate.isEnabled) {
      console.log('[SW Update] Service Worker not enabled');
      return;
    }

    // Check for updates every 6 hours
    this.checkForUpdatesRegularly();

    // Handle version updates
    this.handleVersionUpdates();

    // Check for updates when app becomes stable
    this.checkOnAppStable();

    console.log('[SW Update] Service initialized');
  }

  /**
   * Check for updates regularly
   * @description Schedules a periodic check every 6 hours so long-running sessions eventually receive background updates without user action.
   */
  private checkForUpdatesRegularly(): void {
    // Check every 6 hours
    interval(6 * 60 * 60 * 1000).subscribe(() => {
      this.checkForUpdate();
    });
  }

  /**
   * Check for update when app stabilizes
   * @description Waits for the Angular app to become stable before the first update check to avoid interfering with initial rendering.
   */
  private checkOnAppStable(): void {
    const appIsStable$ = this.appRef.isStable.pipe(first((isStable) => isStable === true));
    appIsStable$.subscribe(() => {
      this.checkForUpdate();
    });
  }

  /**
   * Manual update check
   * @description Can be called on demand (e.g. from a settings button) to verify if a newer app version is available outside the automatic interval.
   */
  async checkForUpdate(): Promise<void> {
    try {
      const updateAvailable = await this.swUpdate.checkForUpdate();
      if (updateAvailable) {
        console.log('[SW Update] New version available');
      }
    } catch (err) {
      console.error('[SW Update] Check failed:', err);
    }
  }

  /**
   * Handle version ready events
   * @description Filters the SW event stream to VERSION_READY only, then prompts the user before activating to avoid unexpected reloads.
   */
  private handleVersionUpdates(): void {
    this.swUpdate.versionUpdates
      .pipe(filter((evt): evt is VersionReadyEvent => evt.type === 'VERSION_READY'))
      .subscribe((event) => {
        console.log('[SW Update] New version ready:', event.latestVersion);
        this.promptUserToUpdate();
      });
  }

  /**
   * Prompt user to update
   * @description Shows a confirm dialog so the user controls when the page reloads, preventing data loss during active form edits.
   */
  private promptUserToUpdate(): void {
    const shouldUpdate = confirm('A new version of DABubble is available. Update now?');

    if (shouldUpdate) {
      this.activateUpdate();
    }
  }

  /**
   * Activate the waiting service worker
   * @description Swaps in the installed service worker and reloads the page so all assets are served from the new cache.
   */
  async activateUpdate(): Promise<void> {
    try {
      await this.swUpdate.activateUpdate();
      document.location.reload();
    } catch (err) {
      console.error('[SW Update] Activation failed:', err);
    }
  }

  /**
   * Force reload all clients (for theme changes)
   * @description Sends a postMessage to the service worker to force-reload all open tabs after a theme manifest switch.
   */
  async forceReloadClients(): Promise<void> {
    if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
      navigator.serviceWorker.controller.postMessage({
        type: 'FORCE_RELOAD_CLIENTS',
      });
    }
  }
}
