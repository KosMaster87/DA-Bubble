/**
 * @fileoverview Footer Component
 * @description Renders the auth-page footer with legal links and route-aware signup affordance.
 * @module FooterComponent
 */

import { Component, computed, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router } from '@angular/router';
import { PopupSignupComponent } from '@features/auth/components/popup-signup/popup-signup.component';
import { LegalInformationComponent } from '@shared/components/legal-information/legal-information.component';
import { filter, map, startWith } from 'rxjs';

@Component({
  selector: 'app-footer',
  imports: [PopupSignupComponent, LegalInformationComponent],
  templateUrl: './footer.component.html',
  styleUrl: './footer.component.scss',
})
export class FooterComponent {
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
   * @description Restricts signup-link visibility to the signin route so footer actions remain relevant to current auth context.
   * @protected
   * @returns {boolean} True if on signin page
   */
  protected showPopupSignup = computed(() => {
    const url = this.currentUrl();
    return url === '/' || url === '';
  });
}
