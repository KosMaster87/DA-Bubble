/**
 * @fileoverview Imprint Component
 * @description Displays imprint/legal notice (Impressum) information
 * @module ImprintComponent
 */

import { Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { AuthStore } from '@stores/auth';
import { SecondaryButtonComponent } from '@shared/components';

@Component({
  selector: 'app-imprint',
  imports: [SecondaryButtonComponent],
  templateUrl: './imprint.component.html',
  styleUrl: './imprint.component.scss',
})
export class ImprintComponent {
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
