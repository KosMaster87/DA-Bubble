/**
 * @fileoverview Privacy Policy Component
 * @description Displays privacy policy (Datenschutz) information
 * @module PrivacyPolicyComponent
 */

import { Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { AuthStore } from '@stores/auth';
import { SecondaryButtonComponent } from '@shared/components';

@Component({
  selector: 'app-privacy-policy',
  imports: [SecondaryButtonComponent],
  templateUrl: './privacy-policy.component.html',
  styleUrl: './privacy-policy.component.scss',
})
export class PrivacyPolicyComponent {
  private router = inject(Router);
  private authStore = inject(AuthStore);

  /**
   * Navigate back based on authentication status
   * @description Keeps this component focused on UI orchestration while delegating domain logic to dedicated services and stores.
   * @async
   * @function goBack
   * @returns {Promise<void>}
   */
  async goBack(): Promise<void> {
    const isAuthenticated = this.authStore.isAuthenticated();
    if (isAuthenticated) {
      await this.router.navigate(['/dashboard']);
    } else {
      await this.router.navigate(['/']);
    }
  }
}
