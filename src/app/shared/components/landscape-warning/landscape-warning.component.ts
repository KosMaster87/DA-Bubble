/**
 * @fileoverview Landscape Warning Component
 * @description Displays a warning overlay when the device is in landscape mode on mobile browsers (not PWA).
 * Provides an option to install the app for a better experience.
 * @module LandscapeWarningComponent
 */

import { Component, OnInit, OnDestroy, signal, inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

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
  private isBrowser = isPlatformBrowser(this.platformId);

  protected showWarning = signal(false);
  protected isHidden = signal(true);
  protected canInstallPWA = signal(false);

  private deferredPrompt: any = null;
  private resizeHandler?: () => void;
  private orientationHandler?: () => void;
  private displayModeHandler?: (e: MediaQueryListEvent) => void;
  private beforeInstallPromptHandler?: (e: Event) => void;

  ngOnInit(): void {
    if (!this.isBrowser) return;

    this.initLandscapeWarning();
  }

  ngOnDestroy(): void {
    if (!this.isBrowser) return;

    this.cleanup();
  }

  /**
   * Initialize landscape warning functionality
   */
  private initLandscapeWarning(): void {
    if (!this.isMobileDevice()) return;

    this.showWarning.set(true);
    this.updateVisibility();
    this.setupEventListeners();
  }

  /**
   * Setup all event listeners
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
   */
  private isLandscape(): boolean {
    return window.innerWidth > window.innerHeight && window.innerWidth <= 1080;
  }

  /**
   * Check if device is mobile
   */
  private isMobileDevice(): boolean {
    return window.innerWidth <= 1080;
  }

  /**
   * Lock body scroll
   */
  private lockBodyScroll(): void {
    document.body.style.overflow = 'hidden';
    document.body.style.position = 'fixed';
    document.body.style.width = '100%';
    document.body.style.top = `-${window.scrollY}px`;
  }

  /**
   * Unlock body scroll
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
   */
  protected async installPWA(): Promise<void> {
    try {
      if (!this.deferredPrompt) {
        alert('Installation wurde bereits abgeschlossen oder ist nicht verfügbar.');
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
