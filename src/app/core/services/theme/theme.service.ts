/**
 * @fileoverview Theme service for managing application themes
 * @description Angular service for switching between light, dark, and device themes.
 *              Handles manifest switching, favicon updates, and browser UI theming.
 * @module core/services/theme
 */

import { Injectable, Renderer2, RendererFactory2, signal } from '@angular/core';
import { DOCUMENT } from '@angular/common';
import { inject } from '@angular/core';

export type Theme = 'device' | 'light' | 'dark';
export type ResolvedTheme = 'light' | 'dark';

interface ThemeConfig {
  theme: Theme;
  resolvedTheme: ResolvedTheme;
}

@Injectable({
  providedIn: 'root',
})
export class ThemeService {
  private readonly document = inject(DOCUMENT);
  private readonly rendererFactory = inject(RendererFactory2);
  private readonly renderer: Renderer2;

  private readonly STORAGE_KEY = 'dabubbleTheme';
  private readonly THEMES: Theme[] = ['device', 'light', 'dark'];

  private readonly MANIFEST_PATHS = {
    dark: '/manifest-dark.webmanifest',
    light: '/manifest-light.webmanifest',
  };

  private readonly FAVICON_PATHS = {
    dark: '/theme-dark/favicon.png',
    light: '/theme-light/favicon.png',
  };

  // Signal für reactive Theme State
  public currentTheme = signal<Theme>('device');
  public currentResolvedTheme = signal<ResolvedTheme>('light');

  private systemThemeListener: ((event: MediaQueryListEvent) => void) | null = null;

  constructor() {
    this.renderer = this.rendererFactory.createRenderer(null, null);
  }

  /**
   * Initialize theme service - call this in app initialization
   */
  async initTheme(): Promise<void> {
    try {
      const theme = this.getStoredTheme();
      await this.applyTheme(theme);
      console.log('[Theme Service] Initialized with theme:', theme);
    } catch (error) {
      console.error('[Theme Service] Init failed:', error);
    }
  }

  /**
   * Get theme from localStorage
   */
  private getStoredTheme(): Theme {
    if (typeof window === 'undefined') return 'device';
    const stored = localStorage.getItem(this.STORAGE_KEY) as Theme;
    return this.THEMES.includes(stored) ? stored : 'device';
  }

  /**
   * Store theme in localStorage
   */
  private storeTheme(theme: Theme): void {
    if (typeof window === 'undefined') return;
    localStorage.setItem(this.STORAGE_KEY, theme);
  }

  /**
   * Get system color scheme preference
   */
  private getSystemTheme(): ResolvedTheme {
    if (typeof window === 'undefined') return 'light';
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }

  /**
   * Resolve theme to light or dark
   */
  private resolveTheme(theme: Theme): ResolvedTheme {
    return theme === 'device' ? this.getSystemTheme() : theme;
  }

  /**
   * Get next theme in rotation cycle
   */
  getNextTheme(current: Theme): Theme {
    const idx = this.THEMES.indexOf(current);
    return this.THEMES[(idx + 1) % this.THEMES.length];
  }

  /**
   * Apply theme to document
   */
  async applyTheme(theme: Theme): Promise<void> {
    try {
      const resolvedTheme = this.resolveTheme(theme);

      // Update signals
      this.currentTheme.set(theme);
      this.currentResolvedTheme.set(resolvedTheme);

      // Store theme
      this.storeTheme(theme);

      // Apply to document
      this.document.documentElement.setAttribute('data-theme', resolvedTheme);

      // Force reflow
      void this.document.documentElement.offsetHeight;

      // Update manifest and favicon
      this.updateManifestAndFavicon(resolvedTheme);

      // Update theme-color meta tag
      this.updateThemeColorMeta(resolvedTheme);

      // Setup system theme listener if needed
      this.setupSystemThemeListener(theme);

      // Sync with service worker
      this.syncWithServiceWorker();

      console.log('[Theme Service] Applied theme:', theme, '→', resolvedTheme);
    } catch (error) {
      console.error('[Theme Service] Apply theme failed:', error);
    }
  }

  /**
   * Toggle to next theme
   */
  async toggleTheme(): Promise<void> {
    const current = this.currentTheme();
    const next = this.getNextTheme(current);
    await this.applyTheme(next);
  }

  /**
   * Set specific theme
   */
  async setTheme(theme: Theme): Promise<void> {
    await this.applyTheme(theme);
  }

  /**
   * Update manifest link element
   */
  private updateManifestAndFavicon(resolvedTheme: ResolvedTheme): void {
    // Remove old manifest and favicon links
    this.removeManifestAndFaviconLinks();

    // Add new ones with cache buster
    const version = Math.floor(Date.now() / 1000);
    const manifestPath = `${this.MANIFEST_PATHS[resolvedTheme]}?v=${version}`;
    const faviconPath = this.FAVICON_PATHS[resolvedTheme];

    // Create and add manifest link
    const manifestLink = this.renderer.createElement('link');
    this.renderer.setAttribute(manifestLink, 'rel', 'manifest');
    this.renderer.setAttribute(manifestLink, 'href', manifestPath);
    this.renderer.setAttribute(manifestLink, 'id', 'manifest-link');
    this.renderer.appendChild(this.document.head, manifestLink);

    // Create and add favicon link
    const faviconLink = this.renderer.createElement('link');
    this.renderer.setAttribute(faviconLink, 'rel', 'icon');
    this.renderer.setAttribute(faviconLink, 'type', 'image/png');
    this.renderer.setAttribute(faviconLink, 'href', faviconPath);
    this.renderer.appendChild(this.document.head, faviconLink);
  }

  /**
   * Remove existing manifest and favicon links
   */
  private removeManifestAndFaviconLinks(): void {
    const links = this.document.querySelectorAll('link[rel="manifest"], link[rel*="icon"]');
    links.forEach((link) => this.renderer.removeChild(this.document.head, link));
  }

  /**
   * Update theme-color meta tag for browser UI
   */
  private updateThemeColorMeta(resolvedTheme: ResolvedTheme): void {
    let metaThemeColor = this.document.querySelector('meta[name="theme-color"]');

    if (!metaThemeColor) {
      metaThemeColor = this.renderer.createElement('meta');
      this.renderer.setAttribute(metaThemeColor, 'name', 'theme-color');
      this.renderer.appendChild(this.document.head, metaThemeColor);
    }

    // Get color from CSS variable (body background)
    const color = this.getThemeColorFromCSS();
    this.renderer.setAttribute(metaThemeColor, 'content', color);
  }

  /**
   * Get theme color from CSS variables
   */
  private getThemeColorFromCSS(): string {
    const styles = window.getComputedStyle(this.document.documentElement);
    const color = styles.getPropertyValue('--background-color').trim();
    return color || '#eceefe'; // fallback to light theme color
  }

  /**
   * Setup system theme change listener
   */
  private setupSystemThemeListener(theme: Theme): void {
    this.removeSystemThemeListener();

    if (theme !== 'device') return;

    this.systemThemeListener = (event: MediaQueryListEvent) => {
      const newSystemTheme: ResolvedTheme = event.matches ? 'dark' : 'light';
      console.log('[Theme Service] System theme changed to:', newSystemTheme);

      this.currentResolvedTheme.set(newSystemTheme);
      this.document.documentElement.setAttribute('data-theme', newSystemTheme);
      this.updateManifestAndFavicon(newSystemTheme);
      this.updateThemeColorMeta(newSystemTheme);
      this.syncWithServiceWorker();
    };

    window
      .matchMedia('(prefers-color-scheme: dark)')
      .addEventListener('change', this.systemThemeListener);

    console.log('[Theme Service] System theme listener activated');
  }

  /**
   * Remove system theme change listener
   */
  private removeSystemThemeListener(): void {
    if (this.systemThemeListener) {
      window
        .matchMedia('(prefers-color-scheme: dark)')
        .removeEventListener('change', this.systemThemeListener);
      this.systemThemeListener = null;
    }
  }

  /**
   * Sync theme settings with service worker
   */
  private syncWithServiceWorker(): void {
    if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
      const settings = {
        dabubbleTheme: this.currentTheme(),
        resolvedTheme: this.currentResolvedTheme(),
      };

      navigator.serviceWorker.controller.postMessage({
        type: 'SYNC_THEME',
        payload: settings,
      });
    }
  }

  /**
   * Clean up listeners on service destroy
   */
  ngOnDestroy(): void {
    this.removeSystemThemeListener();
  }
}
