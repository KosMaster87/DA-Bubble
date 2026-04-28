/**
 * @fileoverview Header Component
 * @description Renders the global auth-page header and conditionally exposes signup navigation based on current route context.
 * @module HeaderComponent
 */

import { Component, computed, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router } from '@angular/router';
import { PopupSignupComponent } from '@features/auth/components/popup-signup/popup-signup.component';
import { DABubbleLogoComponent } from '@shared/components/dabubble-logo/dabubble-logo.component';
import { filter, map, startWith } from 'rxjs';

@Component({
  selector: 'app-header',
  imports: [DABubbleLogoComponent, PopupSignupComponent],
  templateUrl: './header.component.html',
  styleUrl: './header.component.scss',
})
export class HeaderComponent {
  private router = inject(Router);

  /**
   * Signal tracking the current URL from router navigation events
   * @private
   */
  private currentUrl = toSignal(
    this.router.events.pipe(
      filter((event) => event instanceof NavigationEnd),
      map(() => this.router.url),
      startWith(this.router.url),
    ),
  );

  /**
   * Computed signal that determines if popup-signup should be shown
   * @description Restricts signup-link visibility to the signin route so registration entry points stay context-appropriate.
   * @protected
   * @returns {boolean} True if on signin page
   */
  protected showPopupSignup = computed(() => {
    const url = this.currentUrl();
    return url === '/' || url === '';
  });
}
