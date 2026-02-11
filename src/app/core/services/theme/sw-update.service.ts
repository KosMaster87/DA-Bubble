/**
 * @fileoverview Service Worker Update Service
 * @description Handles PWA updates and cache management for DABubble
 * @module core/services/theme/sw-update.service
 */

import { Injectable, ApplicationRef } from '@angular/core';
import { SwUpdate, VersionReadyEvent } from '@angular/service-worker';
import { filter, first, interval } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class SwUpdateService {
  constructor(
    private swUpdate: SwUpdate,
    private appRef: ApplicationRef
  ) {}

  /**
   * Initialize service worker update handling
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
   */
  private checkForUpdatesRegularly(): void {
    // Check every 6 hours
    interval(6 * 60 * 60 * 1000).subscribe(() => {
      this.checkForUpdate();
    });
  }

  /**
   * Check for update when app stabilizes
   */
  private checkOnAppStable(): void {
    const appIsStable$ = this.appRef.isStable.pipe(
      first((isStable) => isStable === true)
    );
    appIsStable$.subscribe(() => {
      this.checkForUpdate();
    });
  }

  /**
   * Manual update check
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
   */
  private handleVersionUpdates(): void {
    this.swUpdate.versionUpdates
      .pipe(
        filter((evt): evt is VersionReadyEvent => evt.type === 'VERSION_READY')
      )
      .subscribe((event) => {
        console.log('[SW Update] New version ready:', event.latestVersion);
        this.promptUserToUpdate();
      });
  }

  /**
   * Prompt user to update
   */
  private promptUserToUpdate(): void {
    const shouldUpdate = confirm(
      'A new version of DABubble is available. Update now?'
    );

    if (shouldUpdate) {
      this.activateUpdate();
    }
  }

  /**
   * Activate the waiting service worker
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
   */
  async forceReloadClients(): Promise<void> {
    if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
      navigator.serviceWorker.controller.postMessage({
        type: 'FORCE_RELOAD_CLIENTS',
      });
    }
  }
}
