/**
 * @fileoverview Responsive View Service
 * @description Centralized service for managing responsive breakpoints and viewport state
 * @module shared/services/responsive-view
 */

import { Injectable, signal, computed, effect, inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

/**
 * Breakpoint configuration interface
 */
export interface Breakpoints {
  mobile: number;
  tablet: number;
  tabletLandscape: number;
  laptop: number;
  desktop: number;
  largeDesktop: number;
  sidebarCollapse: number;
  contentCollapse: number;
}

/**
 * Default breakpoint values matching SCSS mixins
 */
const DEFAULT_BREAKPOINTS: Breakpoints = {
  mobile: 767,           // max-width for mobile (< 768px)
  tablet: 768,           // min-width for tablet
  tabletLandscape: 1024, // min-width for tablet landscape
  laptop: 1440,          // min-width for laptop
  desktop: 1920,         // min-width for desktop
  largeDesktop: 2560,    // min-width for large desktop
  sidebarCollapse: 1440, // max-width where sidebar should auto-collapse
  contentCollapse: 1280, // max-width where content should collapse when thread is open
};

@Injectable({
  providedIn: 'root',
})
export class ResponsiveViewService {
  private platformId = inject(PLATFORM_ID);
  private isBrowser = isPlatformBrowser(this.platformId);

  // Current viewport width signal
  private _viewportWidth = signal<number>(this.isBrowser ? window.innerWidth : 1920);
  readonly viewportWidth = this._viewportWidth.asReadonly();

  // Breakpoint signals - computed from viewport width
  readonly isMobile = computed(() => this._viewportWidth() < DEFAULT_BREAKPOINTS.tablet);
  readonly isTablet = computed(() =>
    this._viewportWidth() >= DEFAULT_BREAKPOINTS.tablet &&
    this._viewportWidth() < DEFAULT_BREAKPOINTS.tabletLandscape
  );
  readonly isTabletLandscape = computed(() =>
    this._viewportWidth() >= DEFAULT_BREAKPOINTS.tabletLandscape &&
    this._viewportWidth() < DEFAULT_BREAKPOINTS.laptop
  );
  readonly isLaptop = computed(() =>
    this._viewportWidth() >= DEFAULT_BREAKPOINTS.laptop &&
    this._viewportWidth() < DEFAULT_BREAKPOINTS.desktop
  );
  readonly isDesktop = computed(() =>
    this._viewportWidth() >= DEFAULT_BREAKPOINTS.desktop &&
    this._viewportWidth() < DEFAULT_BREAKPOINTS.largeDesktop
  );
  readonly isLargeDesktop = computed(() =>
    this._viewportWidth() >= DEFAULT_BREAKPOINTS.largeDesktop
  );

  // Convenience computed signals
  readonly isMobileOrTablet = computed(() => this.isMobile() || this.isTablet());
  readonly isTabletOrLarger = computed(() => this._viewportWidth() >= DEFAULT_BREAKPOINTS.tablet);
  readonly isLaptopOrLarger = computed(() => this._viewportWidth() >= DEFAULT_BREAKPOINTS.laptop);
  readonly isDesktopOrLarger = computed(() => this._viewportWidth() >= DEFAULT_BREAKPOINTS.desktop);

  // Sidebar collapse breakpoint
  readonly shouldCollapseSidebar = computed(() =>
    this._viewportWidth() <= DEFAULT_BREAKPOINTS.sidebarCollapse
  );

  // Content collapse breakpoint (when thread is open)
  readonly shouldCollapseContent = computed(() =>
    this._viewportWidth() <= DEFAULT_BREAKPOINTS.contentCollapse
  );

  constructor() {
    if (this.isBrowser) {
      this.initializeResizeListener();
    }
  }

  /**
   * Initialize window resize listener
   * Updates viewport width on resize events
   * @private
   * @returns {void}
   */
  private initializeResizeListener(): void {
    window.addEventListener('resize', () => {
      this._viewportWidth.set(window.innerWidth);
    });
  }

  /**
   * Manually update viewport width
   * Useful for testing or manual updates
   * @param {number} width - New viewport width
   * @returns {void}
   */
  updateViewportWidth(width: number): void {
    this._viewportWidth.set(width);
  }

  /**
   * Get current viewport width
   * @returns {number} Current viewport width in pixels
   */
  getCurrentWidth(): number {
    return this._viewportWidth();
  }

  /**
   * Check if viewport matches specific breakpoint
   * @param {keyof Breakpoints} breakpoint - Breakpoint name to check
   * @returns {boolean} True if viewport is at or above breakpoint
   */
  isAtBreakpoint(breakpoint: keyof Breakpoints): boolean {
    const width = this._viewportWidth();
    const breakpointValue = DEFAULT_BREAKPOINTS[breakpoint];

    switch (breakpoint) {
      case 'mobile':
        return width <= breakpointValue;
      case 'sidebarCollapse':
        return width <= breakpointValue;
      case 'contentCollapse':
        return width <= breakpointValue;
      default:
        return width >= breakpointValue;
    }
  }

  /**
   * Get breakpoint name for current viewport
   * @returns {string} Current breakpoint name
   */
  getCurrentBreakpoint(): string {
    const width = this._viewportWidth();

    if (width < DEFAULT_BREAKPOINTS.tablet) return 'mobile';
    if (width < DEFAULT_BREAKPOINTS.tabletLandscape) return 'tablet';
    if (width < DEFAULT_BREAKPOINTS.laptop) return 'tablet-landscape';
    if (width < DEFAULT_BREAKPOINTS.desktop) return 'laptop';
    if (width < DEFAULT_BREAKPOINTS.largeDesktop) return 'desktop';
    return 'large-desktop';
  }
}
