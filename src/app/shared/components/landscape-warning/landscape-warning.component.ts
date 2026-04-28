/**
 * @fileoverview Landscape Warning Component
 * @description Displays a warning overlay when the device is in landscape mode on mobile browsers (not PWA).
 * Provides an option to install the app for a better experience.
 * @module LandscapeWarningComponent
 */

import { isPlatformBrowser } from '@angular/common';
import { Component, inject, OnDestroy, OnInit, PLATFORM_ID, signal } from '@angular/core';
import { notificationCopy } from '@core/services/notification/notification-copy';
import { NotificationService } from '@core/services/notification/notification.service';

/**
 * Landscape Warning Component
 * @description Shows a warning overlay in browser (not PWA) when device is in landscape mode
 */
@Component({
  selector: 'app-landscape-warning',
  standalone: true,
  imports: [],
  template: `
    @if (showWarning()) {
      <div class="landscape-warning" [class.landscape-warning--hidden]="isHidden()">
        <h2 class="landscape-warning__title">Portrait mode only supported</h2>
        <p class="landscape-warning__text">
          For the best user experience, please rotate your device to portrait mode.
        </p>
        @if (canInstallPWA()) {
          <p class="landscape-warning__text">
            It is also recommended to install the app for additional features.
          </p>
          <div class="landscape-warning__actions">
            <button
              (click)="installPWA()"
              class="landscape-warning__btn landscape-warning__btn--primary"
            >
              Install App
            </button>
          </div>
        }
      </div>
    }
  `,
})
export class LandscapeWarningComponent implements OnInit, OnDestroy {
  private platformId = inject(PLATFORM_ID);
  private notificationService = inject(NotificationService);
  private isBrowser = isPlatformBrowser(this.platformId);

  protected showWarning = signal(false);
  protected isHidden = signal(true);
  protected canInstallPWA = signal(false);

  private deferredPrompt: any = null;
  private resizeHandler?: () => void;
  private orientationHandler?: () => void;
  private displayModeHandler?: (e: MediaQueryListEvent) => void;
  private beforeInstallPromptHandler?: (e: Event) => void;

  /**
   * Initialize browser-only landscape warning lifecycle.
   * @description Starts warning setup only in browser contexts so server-side rendering stays side-effect free.
   * @returns {void}
   */
  ngOnInit(): void {
    if (!this.isBrowser) return;

    this.initLandscapeWarning();
  }

  /**
   * Tear down browser listeners on component destroy.
   * @description Ensures all landscape warning subscriptions and handlers are cleaned up to prevent leaks after navigation.
   * @returns {void}
   */
  ngOnDestroy(): void {
    if (!this.isBrowser) return;

    this.cleanup();
  }

  /**
   * Initialize landscape warning functionality
    * @description Gates landscape handling behind mobile-device detection so desktop users never receive irrelevant orientation overlays.
   */
  private initLandscapeWarning(): void {
    if (!this.isMobileDevice()) return;

    this.showWarning.set(true);
    this.updateVisibility();
    this.setupEventListeners();
  }

  /**
   * Setup all event listeners
    * @description Registers orientation, resize, install-prompt, and display-mode listeners together so visibility recalculation always uses the same trigger set.
   */
  private setupEventListeners(): void {
    // Before install prompt
    this.beforeInstallPromptHandler = (e: Event) => {
      e.preventDefault();
      this.deferredPrompt = e;
      this.canInstallPWA.set(true);
    };
    window.addEventListener('beforeinstallprompt', this.beforeInstallPromptHandler);

    // Orientation change
    this.orientationHandler = () => {
      setTimeout(() => this.updateVisibility(), 100);
    };
    window.addEventListener('orientationchange', this.orientationHandler);

    // Resize
    this.resizeHandler = () => this.updateVisibility();
    window.addEventListener('resize', this.resizeHandler);

    // Display mode change (PWA installed)
    this.displayModeHandler = (e: MediaQueryListEvent) => {
      if (e.matches) {
        this.updateVisibility();
      }
    };
    window
      .matchMedia('(display-mode: standalone)')
      .addEventListener('change', this.displayModeHandler);
  }

  /**
   * Clean up event listeners
    * @description Removes every registered browser handler and restores body scroll state to avoid persistent UI side effects after component teardown.
   */
  private cleanup(): void {
    if (this.resizeHandler) {
      window.removeEventListener('resize', this.resizeHandler);
    }
    if (this.orientationHandler) {
      window.removeEventListener('orientationchange', this.orientationHandler);
    }
    if (this.displayModeHandler) {
      window
        .matchMedia('(display-mode: standalone)')
        .removeEventListener('change', this.displayModeHandler);
    }
    if (this.beforeInstallPromptHandler) {
      window.removeEventListener('beforeinstallprompt', this.beforeInstallPromptHandler);
    }

    this.unlockBodyScroll();
  }

  /**
   * Update warning visibility based on orientation and PWA status
    * @description Computes overlay visibility from a single predicate so scroll-lock and hidden-state transitions stay synchronized.
   */
  private updateVisibility(): void {
    const shouldShow = !this.isPWA() && this.isLandscape();

    if (shouldShow) {
      this.isHidden.set(false);
      this.lockBodyScroll();
    } else {
      this.isHidden.set(true);
      this.unlockBodyScroll();
    }
  }

  /**
   * Check if running as PWA
    * @description Detects standalone launch modes so installed-app usage bypasses browser-orientation warning UX.
   */
  private isPWA(): boolean {
    return (
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as any).standalone === true ||
      document.referrer.includes('android-app://')
    );
  }

  /**
   * Check if device is in landscape mode
    * @description Uses viewport ratio and width cap so the warning targets handheld landscape layouts instead of wide desktop screens.
   */
  private isLandscape(): boolean {
    return window.innerWidth > window.innerHeight && window.innerWidth <= 1080;
  }

  /**
   * Check if device is mobile
    * @description Limits warning feature activation to smaller viewports where orientation restrictions affect usability most.
   */
  private isMobileDevice(): boolean {
    return window.innerWidth <= 1080;
  }

  /**
   * Lock body scroll
    * @description Freezes page scroll while the warning is visible so background content cannot move beneath the blocking overlay.
   */
  private lockBodyScroll(): void {
    document.body.style.overflow = 'hidden';
    document.body.style.position = 'fixed';
    document.body.style.width = '100%';
    document.body.style.top = `-${window.scrollY}px`;
  }

  /**
   * Unlock body scroll
    * @description Restores normal body styles and previous scroll position so dismissal returns users to their exact reading context.
   */
  private unlockBodyScroll(): void {
    const scrollY = document.body.style.top;
    document.body.style.overflow = '';
    document.body.style.position = '';
    document.body.style.width = '';
    document.body.style.top = '';
    if (scrollY) {
      window.scrollTo(0, parseInt(scrollY || '0') * -1);
    }
  }

  /**
   * Install PWA
    * @description Uses deferred install prompt flow so installation can be triggered contextually from the warning without forcing immediate browser prompts.
   */
  protected async installPWA(): Promise<void> {
    try {
      if (!this.deferredPrompt) {
        this.notificationService.info(notificationCopy.pwaInstallUnavailable);
        return;
      }

      this.deferredPrompt.prompt();
      const { outcome } = await this.deferredPrompt.userChoice;

      if (outcome === 'accepted') {
        console.log('[Landscape Warning] PWA installation accepted');
      }

      this.deferredPrompt = null;
      this.canInstallPWA.set(false);
    } catch (error) {
      console.error('[Landscape Warning] Install failed:', error);
    }
  }
}
